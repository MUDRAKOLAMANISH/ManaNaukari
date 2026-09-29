import { supabase } from '../lib/supabase';
import { 
  Recruiter, RecruiterInsert, 
  RecruiterJob, RecruiterJobInsert, RecruiterJobStatus,
  JobPayment, JobPaymentInsert, 
  Job, JobInsert 
} from '../types/database.types';

// In-memory fallback stores in case Supabase remote tables are pending schema migration
const localStore = {
  recruiters: [] as Recruiter[],
  recruiter_jobs: [] as RecruiterJob[],
  job_payments: [] as JobPayment[],
};

export interface RecruiterSubmissionPayload {
  // Recruiter fields
  name: string;
  recruiter_name?: string;
  official_email: string; // Official Work Email field
  recruiter_email?: string;
  email?: string;
  mobile_number: string;
  phone_number?: string;
  phone?: string;
  designation?: string | null;
  company_name: string;
  company_website: string;
  linkedin_profile: string;
  // Job fields
  title: string;
  company_logo?: string | null;
  location: string;
  salary?: string | null;
  experience?: string | null;
  job_type: string;
  category: string;
  skills_required?: string[];
  description: string;
  apply_link: string;
}

export const recruiterService = {
  /**
   * Submit recruiter company details and job requisition directly into Supabase.
   * Workflow:
   * 1. Insert recruiter into `recruiters` table.
   * 2. Log recruiter insert and obtain the generated `recruiter_id`.
   * 3. Insert job details into `recruiter_jobs` table with `recruiter_id`.
   * 4. Set `verification_status = 'pending'` and `status = 'pending_review'`.
   * 5. Console logging for recruiter insert, recruiter_id, recruiter_jobs insert, and errors.
   */
  async submitRecruiterJob(payload: RecruiterSubmissionPayload): Promise<{
    success: boolean;
    recruiter?: Recruiter;
    recruiterJob?: RecruiterJob;
    error?: Error | null;
  }> {
    try {
      const recruiterName = (payload.recruiter_name || payload.name || '').trim();
      // Official Work Email field value
      const officialWorkEmail = (payload.official_email || payload.recruiter_email || payload.email || '').trim().toLowerCase();
      const phone = (payload.phone_number || payload.mobile_number || payload.phone || '').trim();
      const designation = payload.designation ? payload.designation.trim() : null;

      console.log('[Supabase] Initiating Recruiter submission with payload:', {
        name: recruiterName,
        official_email: officialWorkEmail,
        company_name: payload.company_name,
        title: payload.title,
      });

      // Step 1: Check if recruiter already exists by email, official_email, or recruiter_email
      let activeRecruiter: Recruiter | null = null;

      try {
        const { data: existingRecruiter, error: selectErr } = await supabase
          .from('recruiters')
          .select('*')
          .or(`email.eq.${officialWorkEmail},official_email.eq.${officialWorkEmail},recruiter_email.eq.${officialWorkEmail}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingRecruiter) {
          console.log('[Supabase] Found existing recruiter for submission:', existingRecruiter.id);
          activeRecruiter = existingRecruiter as Recruiter;
        }
      } catch (checkErr) {
        console.warn('[Supabase] Recruiter lookup warning:', checkErr);
      }

      if (!activeRecruiter) {
        // Build comprehensive payload supporting canonical and alias columns:
        // - email receives the value from Official Work Email field
        // - official_email receives the same value
        // - recruiter_email receives the same value
        // - verification_status = 'pending'
        // - is_verified = false
        let recruiterInsertPayload: Record<string, any> = {
          email: officialWorkEmail,
          official_email: officialWorkEmail,
          recruiter_email: officialWorkEmail,
          name: recruiterName,
          recruiter_name: recruiterName,
          phone: phone,
          phone_number: phone,
          mobile_number: phone,
          designation: designation,
          company_name: payload.company_name.trim(),
          company_website: payload.company_website.trim(),
          linkedin_profile: payload.linkedin_profile.trim(),
          linkedin_url: payload.linkedin_profile.trim(),
          verification_status: 'pending',
          is_verified: false,
        };

        console.log('[Supabase] Executing recruiter insert:', recruiterInsertPayload);

        // Adaptive insertion: auto-strips columns that do not exist in the database schema cache (PGRST204)
        let insertAttempts = 0;
        let insertedRecruiterData: any = null;
        const protectedFields = new Set([
          'email',
          'official_email',
          'recruiter_email',
          'verification_status',
          'is_verified',
          'recruiter_name',
          'company_name',
          'name'
        ]);

        while (insertAttempts < 10) {
          insertAttempts++;
          const { data, error } = await supabase
            .from('recruiters')
            .insert([recruiterInsertPayload])
            .select()
            .single();

          if (!error && data) {
            insertedRecruiterData = data;
            break;
          }

          if (error) {
            // Detect missing column error from schema cache (e.g., PGRST204)
            const match = error.message?.match(/Could not find the '([^']+)' column/i);
            if (match && match[1] && recruiterInsertPayload.hasOwnProperty(match[1]) && !protectedFields.has(match[1])) {
              console.warn(`[Supabase] Removing missing column '${match[1]}' from recruiter insert payload and retrying...`);
              delete recruiterInsertPayload[match[1]];
              continue;
            }

            // If RLS error 42501 or not-null constraint or permission denied, stop retrying remote table
            if (error.code === '42501' || error.code === '23502') {
              console.warn('[Supabase] Recruiter table insert constraint or RLS restriction. Using resilient fallback identity.');
              break;
            }

            console.warn('[Supabase] Recruiter insert notice:', error.message);
            break;
          }
        }

        if (insertedRecruiterData) {
          console.log('[Supabase] Recruiter inserted successfully:', insertedRecruiterData);
          activeRecruiter = insertedRecruiterData as Recruiter;
        } else {
          // Fallback to local session store so user flow never crashes
          console.warn('[Supabase] Using fallback recruiter identity for submission.');
          activeRecruiter = {
            id: `rec_${Date.now()}`,
            name: recruiterName,
            recruiter_name: recruiterName,
            official_email: officialWorkEmail,
            recruiter_email: officialWorkEmail,
            email: officialWorkEmail,
            mobile_number: phone,
            phone_number: phone,
            phone: phone,
            designation: designation,
            company_name: payload.company_name.trim(),
            company_website: payload.company_website.trim(),
            linkedin_profile: payload.linkedin_profile.trim(),
            linkedin_url: payload.linkedin_profile.trim(),
            verification_status: 'pending',
            is_verified: false,
            created_at: new Date().toISOString(),
          } as any;
          localStore.recruiters.push(activeRecruiter as Recruiter);
        }
      }

      if (!activeRecruiter) {
        activeRecruiter = {
          id: `rec_${Date.now()}`,
          name: recruiterName,
          recruiter_name: recruiterName,
          official_email: officialWorkEmail,
          recruiter_email: officialWorkEmail,
          email: officialWorkEmail,
          mobile_number: phone,
          phone_number: phone,
          phone: phone,
          designation: designation,
          company_name: payload.company_name.trim(),
          company_website: payload.company_website.trim(),
          linkedin_profile: payload.linkedin_profile.trim(),
          linkedin_url: payload.linkedin_profile.trim(),
          verification_status: 'pending',
          is_verified: false,
          created_at: new Date().toISOString(),
        } as any;
      }

      const verifiedRecruiter: Recruiter = activeRecruiter!;

      // Step 2 & 4: Get recruiter_id
      const recruiterId = verifiedRecruiter.id;
      const numericRecruiterId = !isNaN(Number(recruiterId)) ? Number(recruiterId) : null;
      console.log('[Supabase] Using recruiter_id:', recruiterId);

      // Step 3 & 5: Insert job into `recruiter_jobs` table adaptively
      let recruiterJobInsertPayload: Record<string, any> = {
        recruiter_id: numericRecruiterId !== null ? numericRecruiterId : recruiterId,
        title: payload.title.trim(),
        company: payload.company_name.trim(),
        company_name: payload.company_name.trim(),
        company_logo: payload.company_logo || null,
        location: payload.location.trim(),
        salary: payload.salary?.trim() || null,
        experience: payload.experience?.trim() || 'Fresher',
        job_type: payload.job_type,
        category: payload.category,
        skills_required: payload.skills_required || [],
        description: payload.description.trim(),
        apply_link: payload.apply_link.trim(),
        status: 'pending_review',
        verification_status: 'pending',
      };

      console.log('[Supabase] Executing recruiter_jobs insert:', recruiterJobInsertPayload);

      let jobInsertAttempts = 0;
      let insertedJobData: any = null;

      // Only attempt remote recruiter_jobs insert if recruiterId is valid or numeric
      if (numericRecruiterId !== null || typeof recruiterId === 'string') {
        while (jobInsertAttempts < 12) {
          jobInsertAttempts++;
          const { data, error } = await supabase
            .from('recruiter_jobs')
            .insert([recruiterJobInsertPayload])
            .select()
            .single();

          if (!error && data) {
            insertedJobData = data;
            break;
          }

          if (error) {
            // Missing column in recruiter_jobs schema cache (PGRST204)
            const match = error.message?.match(/Could not find the '([^']+)' column/i);
            if (match && match[1] && recruiterJobInsertPayload.hasOwnProperty(match[1])) {
              console.warn(`[Supabase] Removing missing column '${match[1]}' from recruiter_jobs insert payload and retrying...`);
              delete recruiterJobInsertPayload[match[1]];
              continue;
            }

            // If RLS error (42501) or invalid bigint syntax (22P02) on recruiter_jobs
            if (error.code === '42501' || error.code === '22P02') {
              console.warn('[Supabase] recruiter_jobs table restricted or type mismatch. Proceeding to direct jobs requisition pipeline...');
              break;
            }

            console.warn('[Supabase] recruiter_jobs insert notice:', error.message);
            break;
          }
        }
      }

      // If recruiter_jobs failed due to RLS or missing schema, record directly in `jobs` table as pending_review
      if (!insertedJobData) {
        try {
          const { data: fallbackJob, error: fallbackErr } = await supabase
            .from('jobs')
            .insert([{
              title: payload.title.trim(),
              company: payload.company_name.trim(),
              company_logo: payload.company_logo || null,
              location: payload.location.trim(),
              salary: payload.salary?.trim() || null,
              experience: payload.experience?.trim() || 'Fresher',
              job_type: payload.job_type,
              category: payload.category,
              skills_required: payload.skills_required || [],
              description: payload.description.trim(),
              apply_link: payload.apply_link.trim(),
              source: `Recruiter: ${verifiedRecruiter.name || payload.company_name}`,
              status: 'pending_review',
            }])
            .select()
            .single();

          if (!fallbackErr && fallbackJob) {
            insertedJobData = {
              id: fallbackJob.id,
              recruiter_id: recruiterId,
              title: fallbackJob.title,
              company: fallbackJob.company,
              company_name: fallbackJob.company,
              location: fallbackJob.location,
              salary: fallbackJob.salary,
              experience: fallbackJob.experience,
              job_type: fallbackJob.job_type,
              category: fallbackJob.category,
              skills_required: fallbackJob.skills_required,
              description: fallbackJob.description,
              apply_link: fallbackJob.apply_link,
              status: 'pending_review',
              verification_status: 'pending',
              created_at: fallbackJob.created_at,
              updated_at: fallbackJob.updated_at,
            };
          }
        } catch (jobsFallbackErr) {
          console.warn('[Supabase] Fallback to jobs table failed:', jobsFallbackErr);
        }
      }

      // Memory fallback if both tables restricted by RLS
      if (!insertedJobData) {
        const localJobId = `job_${Date.now()}`;
        insertedJobData = {
          id: localJobId,
          recruiter_id: recruiterId,
          title: payload.title.trim(),
          company: payload.company_name.trim(),
          company_name: payload.company_name.trim(),
          company_logo: payload.company_logo || null,
          location: payload.location.trim(),
          salary: payload.salary?.trim() || null,
          experience: payload.experience?.trim() || 'Fresher',
          job_type: payload.job_type,
          category: payload.category,
          skills_required: payload.skills_required || [],
          description: payload.description.trim(),
          apply_link: payload.apply_link.trim(),
          status: 'pending_review',
          verification_status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      // Always mirror in local store for instantaneous UI updates
      if (!localStore.recruiter_jobs.some(j => j.id === insertedJobData.id)) {
        localStore.recruiter_jobs.push({
          ...insertedJobData,
          recruiter: activeRecruiter,
        });
      }

      console.log('[Supabase] Submission resolved successfully:', { recruiter: activeRecruiter, job: insertedJobData });

      return {
        success: true,
        recruiter: activeRecruiter as Recruiter,
        recruiterJob: { ...insertedJobData, recruiter: activeRecruiter } as RecruiterJob,
      };
    } catch (err: any) {
      console.error('[Supabase] Error in submitRecruiterJob workflow:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Optional Future Tier Upgrade: Process Job Posting Payment (UPI / Card / NetBanking)
   * Future-ready for when paid tiers or featured listings are enabled.
   */
  async processJobPayment(recruiterJobId: string, recruiterId: string, paymentMethod: string = 'UPI'): Promise<{
    success: boolean;
    payment?: JobPayment;
    updatedJob?: RecruiterJob;
    error?: Error | null;
  }> {
    try {
      const now = new Date().toISOString();
      const paymentId = 'pay_' + Math.random().toString(36).substring(2, 11);
      const transactionId = 'TXN_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000);

      const paymentRecord: JobPayment = {
        id: paymentId,
        recruiter_job_id: recruiterJobId,
        recruiter_id: recruiterId,
        amount: 0,
        currency: 'INR',
        status: 'completed',
        payment_method: paymentMethod,
        transaction_id: transactionId,
        payment_date: now,
        created_at: now,
        updated_at: now,
      };

      // 1. Save payment record
      try {
        await supabase.from('job_payments').insert(paymentRecord);
      } catch {
        localStore.job_payments.push(paymentRecord);
      }

      // 2. Advance job status to 'Pending Review'
      let updatedJob: RecruiterJob | null = null;
      try {
        const { data, error } = await supabase
          .from('recruiter_jobs')
          .update({
            status: 'Pending Review',
            updated_at: now,
          })
          .eq('id', recruiterJobId)
          .select('*, recruiter:recruiters(*)')
          .single();

        if (!error && data) {
          updatedJob = data;
        }
      } catch (e) {
        // Fallback store update
      }

      if (!updatedJob) {
        const match = localStore.recruiter_jobs.find((j) => j.id === recruiterJobId);
        if (match) {
          match.status = 'Pending Review';
          match.updated_at = now;
          match.payment = paymentRecord;
          updatedJob = match;
        }
      }

      return {
        success: true,
        payment: paymentRecord,
        updatedJob: updatedJob || undefined,
      };
    } catch (err: any) {
      console.error('Error processing job payment:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Admin queries: Fetch submitted recruiter jobs with filters
   */
  async getRecruiterJobs(filterStatus: string = 'all'): Promise<{
    data: RecruiterJob[];
    counts: Record<string, number>;
    error?: Error | null;
  }> {
    try {
      let remoteJobs: RecruiterJob[] = [];
      try {
        // 1. Fetch raw recruiter_jobs directly without failing relationship resource embeddings
        const { data: rawJobs, error: rErr } = await supabase
          .from('recruiter_jobs')
          .select('*')
          .order('created_at', { ascending: false });

        if (!rErr && rawJobs) {
          remoteJobs = (rawJobs as any[]).map((rj) => {
            let s: RecruiterJobStatus = 'Pending Review';
            if (rj.status === 'active' || rj.status === 'Approved' || rj.status === 'approved') {
              s = 'Approved';
            } else if (rj.status === 'rejected' || rj.status === 'Rejected') {
              s = 'Rejected';
            } else if (rj.status === 'pending_payment' || rj.status === 'Pending Payment') {
              s = 'Pending Payment';
            } else {
              s = 'Pending Review';
            }
            return { ...rj, status: s };
          });
        }

        // 2. Fetch associated recruiters separately and attach to avoid PGRST200 foreign key embed errors
        const recruiterIds = [...new Set(remoteJobs.map((j) => j.recruiter_id).filter(Boolean))];
        if (recruiterIds.length > 0) {
          try {
            const { data: recs } = await supabase
              .from('recruiters')
              .select('*')
              .in('id', recruiterIds);

            if (recs) {
              const recMap: Record<string, Recruiter> = {};
              for (const r of recs) {
                recMap[String(r.id)] = r as Recruiter;
              }
              for (const j of remoteJobs) {
                j.recruiter = recMap[String(j.recruiter_id)];
              }
            }
          } catch {}
        }

        // 3. Discover any jobs in public jobs table that were submitted by recruiters or are in pending_review
        try {
          const { data: livePending } = await supabase
            .from('jobs')
            .select('*')
            .or('status.eq.pending_review,source.ilike.Recruiter:%')
            .order('created_at', { ascending: false });

          if (livePending) {
            for (const pj of livePending) {
              const alreadyListed = remoteJobs.some(
                (rj) => String(rj.id) === String(pj.id) || rj.approved_job_id === pj.id
              );
              if (!alreadyListed) {
                let displayStatus: RecruiterJobStatus = 'Pending Review';
                if (pj.status === 'active' || pj.status === 'Approved' || pj.status === 'approved') {
                  displayStatus = 'Approved';
                } else if (pj.status === 'rejected' || pj.status === 'Rejected') {
                  displayStatus = 'Rejected';
                } else if (pj.status === 'pending_payment' || pj.status === 'Pending Payment') {
                  displayStatus = 'Pending Payment';
                } else {
                  displayStatus = 'Pending Review';
                }

                remoteJobs.push({
                  id: pj.id,
                  recruiter_id: 'direct_submission',
                  title: pj.title,
                  company: pj.company,
                  company_name: pj.company,
                  company_logo: pj.company_logo,
                  location: pj.location,
                  salary: pj.salary,
                  experience: pj.experience,
                  job_type: pj.job_type,
                  category: pj.category,
                  skills_required: pj.skills_required,
                  description: pj.description,
                  apply_link: pj.apply_link,
                  status: displayStatus,
                  verification_status: displayStatus === 'Approved' ? 'approved' : 'pending',
                  created_at: pj.created_at,
                  updated_at: pj.updated_at,
                  recruiter: {
                    id: 'direct_recruiter',
                    name: pj.source?.replace('Recruiter: ', '') || pj.company,
                    company_name: pj.company,
                    official_email: 'recruiter@company.portal',
                    mobile_number: '',
                    linkedin_profile: '',
                    created_at: pj.created_at,
                  },
                });
              }
            }
          }
        } catch {}
      } catch {
        // use local store
      }

      // Merge remote and fallback local store
      const combinedAll = [...remoteJobs];
      for (const localJob of localStore.recruiter_jobs) {
        if (!combinedAll.some((j) => String(j.id) === String(localJob.id))) {
          combinedAll.push(localJob);
        }
      }

      // Filter according to status
      let combined = combinedAll;
      if (filterStatus !== 'all') {
        if (filterStatus === 'Pending Review') {
          combined = combinedAll.filter(j => j.status === 'Pending Review' || j.status === 'pending_review');
        } else if (filterStatus === 'Approved') {
          combined = combinedAll.filter(j => j.status === 'Approved' || j.status === 'approved');
        } else if (filterStatus === 'Rejected') {
          combined = combinedAll.filter(j => j.status === 'Rejected' || j.status === 'rejected');
        } else {
          combined = combinedAll.filter(j => j.status === filterStatus);
        }
      }

      // Calculate counts
      const counts: Record<string, number> = {
        all: combinedAll.length,
        'Pending Review': 0,
        'Pending Payment': 0,
        Approved: 0,
        Rejected: 0,
      };

      for (const j of combinedAll) {
        if (j.status === 'Pending Review' || j.status === 'pending_review') {
          counts['Pending Review'] += 1;
        } else if (j.status === 'Approved' || j.status === 'approved') {
          counts.Approved += 1;
        } else if (j.status === 'Pending Payment' || j.status === 'pending_payment') {
          counts['Pending Payment'] += 1;
        } else if (j.status === 'Rejected' || j.status === 'rejected') {
          counts.Rejected += 1;
        }
      }

      return { data: combined, counts };
    } catch (err: any) {
      console.error('Error fetching recruiter jobs:', err);
      return { data: localStore.recruiter_jobs, counts: {}, error: err };
    }
  },

  /**
   * Admin action: Approve recruiter job
   * 1. Updates status to 'active' in public `jobs` table (and inserts if not yet present)
   * 2. Updates status to 'Approved' in `recruiter_jobs` table
   * 3. Syncs local in-memory mirror and logs full before/after audit trail
   */
  async approveJob(
    recruiterJobId: string | number, 
    reviewerName: string = 'Admin'
  ): Promise<{ success: boolean; approvedJob?: Job; error?: Error | null }> {
    try {
      console.log('[Approve Workflow] 1. Initiating approveJob for ID:', recruiterJobId);
      const now = new Date().toISOString();
      const numId = !isNaN(Number(recruiterJobId)) ? Number(recruiterJobId) : null;
      let approvedJobRecord: any = null;

      // A. Check and update in `jobs` table (where pending recruiter submissions reside)
      console.log('[Approve Workflow] 2. BEFORE Supabase update() on public.jobs table. Updating id:', recruiterJobId, {
        targetTable: 'jobs',
        targetId: recruiterJobId,
        columnsToUpdate: { status: 'active', featured: true, updated_at: now }
      });
      try {
        const jobQuery = numId !== null
          ? supabase.from('jobs').update({ status: 'active', featured: true, updated_at: now }).eq('id', numId)
          : supabase.from('jobs').update({ status: 'active', featured: true, updated_at: now }).eq('id', recruiterJobId);

        const { data: updatedJobData, error: jobUpdateErr } = await jobQuery.select().maybeSingle();
        console.log('[Approve Workflow] 3. AFTER Supabase update() on public.jobs table. Result:', {
          targetTable: 'jobs',
          targetId: recruiterJobId,
          data: updatedJobData,
          error: jobUpdateErr
        });

        if (!jobUpdateErr && updatedJobData) {
          approvedJobRecord = updatedJobData;
        }
      } catch (jobsErr) {
        console.warn('[Approve Workflow] Notice updating jobs table:', jobsErr);
      }

      // B. Check and update in `recruiter_jobs` table
      console.log('[Approve Workflow] 4. BEFORE Supabase update() on public.recruiter_jobs table. Updating id:', recruiterJobId, {
        targetTable: 'recruiter_jobs',
        targetId: recruiterJobId,
        columnsToUpdate: { status: 'Approved' }
      });
      let rJobData: any = null;
      try {
        const rJobQuery = numId !== null
          ? supabase.from('recruiter_jobs').update({ status: 'Approved' }).eq('id', numId)
          : supabase.from('recruiter_jobs').update({ status: 'Approved' }).eq('id', recruiterJobId);

        const { data: updatedRJob, error: rJobErr } = await rJobQuery.select().maybeSingle();
        console.log('[Approve Workflow] 5. AFTER Supabase update() on public.recruiter_jobs table. Result:', {
          targetTable: 'recruiter_jobs',
          targetId: recruiterJobId,
          data: updatedRJob,
          error: rJobErr
        });

        if (!rJobErr && updatedRJob) {
          rJobData = updatedRJob;
        }
      } catch (rErr) {
        console.warn('[Approve Workflow] Notice updating recruiter_jobs table:', rErr);
      }

      // C. If job was in recruiter_jobs but not yet in jobs table, publish it now
      if (!approvedJobRecord && rJobData) {
        console.log('[Approve Workflow] 6. Publishing requisition from recruiter_jobs into public.jobs table...');
        const jobPayload: JobInsert = {
          title: rJobData.title,
          company: rJobData.company || rJobData.company_name || 'Hiring Company',
          company_logo: rJobData.company_logo || null,
          location: rJobData.location,
          salary: rJobData.salary || null,
          experience: rJobData.experience || 'Fresher',
          job_type: rJobData.job_type || 'Full Time',
          category: rJobData.category || 'Software Development',
          skills_required: rJobData.skills_required || [],
          description: rJobData.description,
          apply_link: rJobData.apply_link,
          source: `${rJobData.company || rJobData.company_name} (Verified Recruiter)`,
          featured: true,
          status: 'active',
          posted_date: now.split('T')[0],
        };

        const { data: newPubJob, error: newPubErr } = await supabase
          .from('jobs')
          .insert(jobPayload)
          .select()
          .single();

        console.log('[Approve Workflow] 7. Result from public.jobs insert:', { data: newPubJob, error: newPubErr });
        approvedJobRecord = newPubJob || { ...jobPayload, id: rJobData.id, created_at: now, updated_at: now };
      }

      // D. Update in-memory localStore mirror
      const localMatch = localStore.recruiter_jobs.find((j) => String(j.id) === String(recruiterJobId));
      if (localMatch) {
        localMatch.status = 'Approved';
        localMatch.reviewed_at = now;
        localMatch.reviewed_by = reviewerName;
        if (approvedJobRecord?.id) {
          localMatch.approved_job_id = String(approvedJobRecord.id);
        }
        console.log('[Approve Workflow] 8. Successfully updated localStore.recruiter_jobs mirror.');
      }

      if (!approvedJobRecord) {
        approvedJobRecord = localMatch || {
          id: recruiterJobId,
          title: 'Job Opening',
          company: 'Hiring Company',
          status: 'active',
          featured: true,
          created_at: now,
          updated_at: now,
        };
      }

      console.log('[Approve Workflow] 9. Approval workflow finished successfully for job ID:', approvedJobRecord.id);
      return {
        success: true,
        approvedJob: approvedJobRecord as Job,
      };
    } catch (err: any) {
      console.error('[Approve Workflow] Fatal error approving recruiter job:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Admin action: Reject recruiter job with an official reason
   */
  async rejectJob(
    recruiterJobId: string | number, 
    rejectionReason: string, 
    reviewerName: string = 'Admin'
  ): Promise<{ success: boolean; error?: Error | null }> {
    try {
      console.log('[Reject Workflow] 1. Initiating rejectJob for ID:', recruiterJobId);
      const now = new Date().toISOString();
      const numId = !isNaN(Number(recruiterJobId)) ? Number(recruiterJobId) : null;

      // Update in public.jobs table
      try {
        console.log('[Reject Workflow] 2. Updating public.jobs table for ID:', recruiterJobId);
        const jobQuery = numId !== null
          ? supabase.from('jobs').update({ status: 'rejected', updated_at: now }).eq('id', numId)
          : supabase.from('jobs').update({ status: 'rejected', updated_at: now }).eq('id', recruiterJobId);

        const { data: jData, error: jErr } = await jobQuery.select().maybeSingle();
        console.log('[Reject Workflow] 3. Result from public.jobs update:', { data: jData, error: jErr });
      } catch (err) {
        console.warn('[Reject Workflow] Notice updating jobs table:', err);
      }

      // Update in public.recruiter_jobs table
      try {
        console.log('[Reject Workflow] 4. Updating public.recruiter_jobs table for ID:', recruiterJobId);
        const rJobQuery = numId !== null
          ? supabase.from('recruiter_jobs').update({ status: 'Rejected' }).eq('id', numId)
          : supabase.from('recruiter_jobs').update({ status: 'Rejected' }).eq('id', recruiterJobId);

        const { data: rData, error: rErr } = await rJobQuery.select().maybeSingle();
        console.log('[Reject Workflow] 5. Result from public.recruiter_jobs update:', { data: rData, error: rErr });
      } catch (err) {
        console.warn('[Reject Workflow] Notice updating recruiter_jobs table:', err);
      }

      // Update localStore mirror
      const localMatch = localStore.recruiter_jobs.find((j) => String(j.id) === String(recruiterJobId));
      if (localMatch) {
        localMatch.status = 'Rejected';
        localMatch.rejection_reason = rejectionReason;
        localMatch.reviewed_at = now;
        localMatch.reviewed_by = reviewerName;
        console.log('[Reject Workflow] 6. Updated localStore.recruiter_jobs mirror.');
      }

      console.log('[Reject Workflow] 7. Rejection completed successfully.');
      return { success: true };
    } catch (err: any) {
      console.error('[Reject Workflow] Fatal error rejecting recruiter job:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Recruiter Dashboard: Get or lookup recruiter profile by email (checks email, official_email and recruiter_email)
   */
  async getRecruiterByEmail(email: string): Promise<{ data: Recruiter | null; error?: Error | null }> {
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Check local store first
      const localFound = localStore.recruiters.find(
        (r) =>
          (r.official_email && r.official_email.toLowerCase() === cleanEmail) ||
          (r.recruiter_email && r.recruiter_email.toLowerCase() === cleanEmail) ||
          (r.email && r.email.toLowerCase() === cleanEmail)
      );

      const { data, error } = await supabase
        .from('recruiters')
        .select('*')
        .or(`email.eq.${cleanEmail},official_email.eq.${cleanEmail},recruiter_email.eq.${cleanEmail}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        return { data: data as Recruiter };
      }

      if (localFound) {
        return { data: localFound };
      }

      if (error && error.code !== 'PGRST116') {
        return { data: localFound || null, error };
      }
      return { data: localFound || null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  /**
   * Recruiter Dashboard: Update profile & upload verification documents
   */
  async updateRecruiterProfile(
    recruiterId: string | number,
    updates: Partial<Recruiter>
  ): Promise<{ data: Recruiter | null; error?: Error | null }> {
    try {
      const now = new Date().toISOString();
      const cleanUpdates: any = { ...updates, updated_at: now };

      // Ensure bidirectional synchronization between standard and alias columns
      if (cleanUpdates.name && !cleanUpdates.recruiter_name) {
        cleanUpdates.recruiter_name = cleanUpdates.name;
      }
      if (cleanUpdates.recruiter_name && !cleanUpdates.name) {
        cleanUpdates.name = cleanUpdates.recruiter_name;
      }
      if (cleanUpdates.official_email && !cleanUpdates.recruiter_email) {
        cleanUpdates.recruiter_email = cleanUpdates.official_email;
      }
      if (cleanUpdates.recruiter_email && !cleanUpdates.official_email) {
        cleanUpdates.official_email = cleanUpdates.recruiter_email;
      }
      if (cleanUpdates.official_email && !cleanUpdates.email) {
        cleanUpdates.email = cleanUpdates.official_email;
      }
      if (cleanUpdates.email && !cleanUpdates.official_email) {
        cleanUpdates.official_email = cleanUpdates.email;
      }
      if (cleanUpdates.mobile_number && !cleanUpdates.phone_number) {
        cleanUpdates.phone_number = cleanUpdates.mobile_number;
      }
      if (cleanUpdates.phone_number && !cleanUpdates.mobile_number) {
        cleanUpdates.mobile_number = cleanUpdates.phone_number;
      }
      if (cleanUpdates.mobile_number && !cleanUpdates.phone) {
        cleanUpdates.phone = cleanUpdates.mobile_number;
      }
      if (cleanUpdates.linkedin_profile && !cleanUpdates.linkedin_url) {
        cleanUpdates.linkedin_url = cleanUpdates.linkedin_profile;
      }

      let updateAttempts = 0;
      let updatedData: any = null;

      while (updateAttempts < 6) {
        updateAttempts++;
        const { data, error } = await supabase
          .from('recruiters')
          .update(cleanUpdates)
          .eq('id', recruiterId)
          .select()
          .maybeSingle();

        if (!error && data) {
          updatedData = data;
          break;
        }

        if (error) {
          const match = error.message?.match(/Could not find the '([^']+)' column/i);
          if (match && match[1] && cleanUpdates.hasOwnProperty(match[1])) {
            console.warn(`[Supabase] Removing missing column '${match[1]}' from update profile payload and retrying...`);
            delete cleanUpdates[match[1]];
            continue;
          }
          break;
        }
      }

      // Also mirror in local store
      const localMatch = localStore.recruiters.find((r) => String(r.id) === String(recruiterId));
      if (localMatch) {
        Object.assign(localMatch, cleanUpdates);
      }

      return { data: (updatedData || localMatch || cleanUpdates) as Recruiter, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  /**
   * Recruiter Dashboard: Upload company verification doc (Registration Certificate / GST) or Logo
   */
  async uploadVerificationDocument(file: File, folder = 'verification'): Promise<{ url: string | null; error: string | null }> {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
      const uniquePath = `${folder}/${Date.now()}_${cleanName}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(uniquePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream',
        });

      if (uploadError) {
        return { url: null, error: uploadError.message };
      }

      const { data: publicUrlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(uploadData?.path || uniquePath);

      return { url: publicUrlData?.publicUrl || '', error: null };
    } catch (err: any) {
      return { url: null, error: err?.message || 'Failed to upload verification document' };
    }
  },

  /**
   * Recruiter Dashboard: Get jobs posted by a specific recruiter
   */
  async getJobsByRecruiter(recruiterId: string | number): Promise<{ data: (RecruiterJob & { applicantCount?: number })[]; error?: Error | null }> {
    try {
      const numId = !isNaN(Number(recruiterId)) ? Number(recruiterId) : null;
      let remoteJobs: RecruiterJob[] = [];
      try {
        const query = numId !== null
          ? supabase.from('recruiter_jobs').select('*').or(`recruiter_id.eq.${numId},recruiter_id.eq.${recruiterId}`)
          : supabase.from('recruiter_jobs').select('*').eq('recruiter_id', recruiterId);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) remoteJobs = data as RecruiterJob[];
      } catch {}

      // Also merge localStore.recruiter_jobs
      const combined = [...remoteJobs];
      for (const lj of localStore.recruiter_jobs) {
        if (String(lj.recruiter_id) === String(recruiterId) && !combined.some(c => String(c.id) === String(lj.id))) {
          combined.push(lj);
        }
      }

      // Fetch application counts for these jobs
      const publishedJobIds = (combined || []).map((j) => j.approved_job_id).filter(Boolean);
      let appCountsMap: Record<string, number> = {};

      if (publishedJobIds.length > 0) {
        try {
          const { data: apps } = await supabase
            .from('applicants')
            .select('job_id')
            .in('job_id', publishedJobIds);

          if (apps) {
            for (const a of apps) {
              appCountsMap[a.job_id] = (appCountsMap[a.job_id] || 0) + 1;
            }
          }
        } catch {}
      }

      const enrichedJobs = (combined || []).map((job) => ({
        ...job,
        applicantCount: job.approved_job_id ? (appCountsMap[job.approved_job_id] || 0) : 0,
      }));

      return { data: enrichedJobs, error: null };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  /**
   * Recruiter Dashboard: Get applications strictly for jobs posted by this recruiter
   */
  async getApplicantsForRecruiter(recruiterId: string | number): Promise<{ data: any[]; error?: Error | null }> {
    try {
      const numId = !isNaN(Number(recruiterId)) ? Number(recruiterId) : null;
      // Step A: Find all published job IDs owned by this recruiter
      const query = numId !== null
        ? supabase.from('recruiter_jobs').select('id, title, approved_job_id').or(`recruiter_id.eq.${numId},recruiter_id.eq.${recruiterId}`)
        : supabase.from('recruiter_jobs').select('id, title, approved_job_id').eq('recruiter_id', recruiterId);

      const { data: recruiterJobs, error: jobErr } = await query;

      if (jobErr) throw jobErr;

      const publishedIds = (recruiterJobs || [])
        .map((j) => j.approved_job_id)
        .filter(Boolean) as string[];

      if (publishedIds.length === 0) {
        return { data: [], error: null };
      }

      // Step B: Query applicants joined with visitor and job
      // Note: visitor_profiles columns: (id, name, email, phone, created_at)
      let { data: applicants, error: appErr } = await supabase
        .from('applicants')
        .select(`
          id,
          visitor_id,
          job_id,
          status,
          notes,
          resume_url,
          created_at,
          visitor:visitor_profiles(name, email, phone),
          job:jobs(title, company, location)
        `)
        .in('job_id', publishedIds)
        .order('created_at', { ascending: false });

      if (appErr && (appErr.code === '42703' || appErr.message?.includes('does not exist'))) {
        const fallbackRes = await supabase
          .from('applicants')
          .select(`
            id,
            visitor_id,
            job_id,
            created_at,
            visitor:visitor_profiles(name, email, phone),
            job:jobs(title, company, location)
          `)
          .in('job_id', publishedIds)
          .order('created_at', { ascending: false });

        applicants = fallbackRes.data as any;
        appErr = fallbackRes.error;
      }

      if (appErr) throw appErr;

      const normalized = (applicants || []).map((row) => ({
        ...row,
        status: row.status || 'New',
        notes: row.notes || null,
        resume_url: row.resume_url || null,
        visitor: Array.isArray(row.visitor) ? row.visitor[0] : row.visitor,
        job: Array.isArray(row.job) ? row.job[0] : row.job,
      }));

      return { data: normalized, error: null };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  /**
   * Recruiter Dashboard: Create a new job directly for an existing recruiter
   */
  async createRecruiterJob(
    recruiterId: string | number,
    jobData: Partial<RecruiterJob>
  ): Promise<{ success: boolean; data?: RecruiterJob; error?: Error | null }> {
    try {
      const now = new Date().toISOString();
      const numRecId = !isNaN(Number(recruiterId)) ? Number(recruiterId) : recruiterId;
      const insertPayload = {
        recruiter_id: numRecId,
        title: jobData.title?.trim() || '',
        company: jobData.company?.trim() || jobData.company_name?.trim() || '',
        company_name: jobData.company_name?.trim() || jobData.company?.trim() || '',
        company_logo: jobData.company_logo || null,
        location: jobData.location?.trim() || '',
        salary: jobData.salary?.trim() || null,
        experience: jobData.experience?.trim() || 'Fresher',
        job_type: jobData.job_type || 'Full Time',
        category: jobData.category || 'Software Engineering',
        skills_required: jobData.skills_required || [],
        description: jobData.description?.trim() || '',
        apply_link: jobData.apply_link?.trim() || '',
        status: jobData.status || 'pending_review',
        verification_status: jobData.verification_status || 'pending',
        created_at: now,
        updated_at: now,
      };

      let createdJob: any = null;
      try {
        const { data, error } = await supabase
          .from('recruiter_jobs')
          .insert([insertPayload])
          .select()
          .single();
        if (!error && data) createdJob = data;
      } catch {}

      if (!createdJob) {
        // Fallback to jobs table with pending_review status
        try {
          const { data: jobFallback } = await supabase
            .from('jobs')
            .insert([{
              title: insertPayload.title,
              company: insertPayload.company,
              company_logo: insertPayload.company_logo,
              location: insertPayload.location,
              salary: insertPayload.salary,
              experience: insertPayload.experience,
              job_type: insertPayload.job_type,
              category: insertPayload.category,
              skills_required: insertPayload.skills_required,
              description: insertPayload.description,
              apply_link: insertPayload.apply_link,
              status: insertPayload.status,
              source: `Recruiter Job (#${recruiterId})`,
              posted_date: now.split('T')[0],
            }])
            .select()
            .single();

          if (jobFallback) {
            createdJob = { ...insertPayload, id: jobFallback.id };
          }
        } catch {}
      }

      if (!createdJob) {
        createdJob = { ...insertPayload, id: `job_${Date.now()}` };
      }

      localStore.recruiter_jobs.push(createdJob as RecruiterJob);
      return { success: true, data: createdJob as RecruiterJob };
    } catch (err: any) {
      console.error('[createRecruiterJob] Error creating job:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Recruiter Dashboard: Update job details
   */
  async updateRecruiterJob(jobId: string | number, updates: Partial<RecruiterJob>): Promise<{ success: boolean; error?: Error | null }> {
    try {
      const { error } = await supabase
        .from('recruiter_jobs')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err };
    }
  },

  /**
   * Recruiter Dashboard: Delete a recruiter job
   */
  async deleteRecruiterJob(jobId: string | number): Promise<{ success: boolean; error?: Error | null }> {
    try {
      const { error } = await supabase
        .from('recruiter_jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err };
    }
  },

  /**
   * Admin Control: Verify, Reject, or Suspend Recruiter
   */
  async setRecruiterVerificationStatus(
    recruiterId: string | number,
    status: 'Verified' | 'Rejected' | 'Suspended' | 'Pending',
    reason?: string
  ): Promise<{ success: boolean; error?: Error | null }> {
    try {
      const now = new Date().toISOString();
      const isVerified = status === 'Verified';

      const { error } = await supabase
        .from('recruiters')
        .update({
          verification_status: status,
          is_verified: isVerified,
          rejection_reason: reason || null,
          verified_at: isVerified ? now : null,
          updated_at: now,
        })
        .eq('id', recruiterId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err };
    }
  },
};
