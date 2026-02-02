-- Create user_onboarding table
create table if not exists public.user_onboarding (
    user_id uuid not null references auth.users(id) on delete cascade primary key,
    pwa_prompt_seen boolean default false,
    updated_at timestamptz default now()
);

-- RLS policies
alter table public.user_onboarding enable row level security;

create policy "Users can view their own onboarding status"
    on public.user_onboarding for select
    using (auth.uid() = user_id);

create policy "Users can update their own onboarding status"
    on public.user_onboarding for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own onboarding status"
    on public.user_onboarding for update
    using (auth.uid() = user_id);

-- Service role access
create policy "Service role can do everything on user_onboarding"
    on public.user_onboarding
    using (true)
    with check (true);
