-- ============================================================================
-- SQL Migration: Mock Interview Bookings Module
-- Platform: ManaCarrier (Supabase / PostgreSQL)
-- Description:
--   Creates the public.mock_interview_bookings table, enables RLS,
--   adds performance indexes, and configures security policies for candidate bookings
--   and admin management.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mock_interview_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    whatsapp_number VARCHAR(50) NOT NULL,
    interview_topic VARCHAR(150) NOT NULL,
    custom_topic VARCHAR(150),
    experience_level VARCHAR(50) NOT NULL DEFAULT 'Fresher',
    interview_mode VARCHAR(100) NOT NULL DEFAULT 'Technical Interview',
    preferred_availability TEXT,
    additional_information TEXT,
    price_inr INTEGER NOT NULL DEFAULT 99,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'refunded', 'cancelled'
    booking_status VARCHAR(50) NOT NULL DEFAULT 'pending_payment', -- 'pending_payment', 'payment_received', 'scheduled', 'in_progress', 'completed', 'result_sent', 'cancelled'
    admin_notes TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    interview_result TEXT,
    technical_score VARCHAR(50),
    communication_score VARCHAR(50),
    problem_solving_score VARCHAR(50),
    strengths TEXT,
    areas_for_improvement TEXT,
    recommended_next_steps TEXT,
    result_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_mock_bookings_status ON public.mock_interview_bookings (booking_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mock_bookings_payment ON public.mock_interview_bookings (payment_status);
CREATE INDEX IF NOT EXISTS idx_mock_bookings_email ON public.mock_interview_bookings (email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.mock_interview_bookings ENABLE ROW LEVEL SECURITY;

-- 1. Policy: Allow candidates to insert new bookings (Public submission path)
CREATE POLICY "Allow public insert to mock_interview_bookings" 
    ON public.mock_interview_bookings FOR INSERT 
    WITH CHECK (true);

-- 2. Policy: Allow full admin read/update/delete access
CREATE POLICY "Allow admin full access to mock_interview_bookings" 
    ON public.mock_interview_bookings FOR ALL 
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
