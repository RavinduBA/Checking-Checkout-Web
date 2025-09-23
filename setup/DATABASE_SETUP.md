# Supabase Database Setup Instructions

## Overview
This guide will help you set up the complete Hospitality ERP database and configure the demo account for testing.

## Prerequisites
- Supabase project created and connected via MCP
- Access to Supabase SQL Editor

## Step 1: Run Database Schema Setup

1. Open your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire content of `setup_database.sql`
4. Run the script to create all tables, policies, and base data

This will create:
- All necessary tables (locations, profiles, rooms, reservations, etc.)
- Row Level Security policies
- Helper functions (`is_email_allowed`, `get_user_permissions`)
- Demo location data (Asaliya Villa, Rusty Bunk, Antiqua Serenity)
- Sample accounts and expense types

## Step 2: Create Demo User Account

1. In Supabase Dashboard, go to Authentication > Users
2. Click "Add User"
3. Create user with:
   - **Email:** demo@checkingcheckout.com
   - **Password:** Netronk@123
   - **Email Confirm:** Yes (mark as confirmed)

## Step 3: Configure Demo User Profile

1. After creating the user, go back to SQL Editor
2. Copy and paste the content of `setup_demo_user.sql`
3. Run the script to:
   - Create the demo user profile with admin role
   - Set up full permissions for all locations
   - Add sample data (rooms, bookings, income, expenses)

## Step 4: Verify Setup

1. Check that the demo user exists in Authentication > Users
2. Verify the profile was created in the `profiles` table
3. Confirm permissions are set in `user_permissions` table
4. Test login with demo credentials

## Authentication Features Configured

✅ **Demo Credentials Display:** Login page shows demo email and password  
✅ **New Account Registration:** Disabled with warning message  
✅ **Google Login:** Disabled with toast notification  
✅ **Email Allowlist:** Only demo@checkingcheckout.com is allowed  

## Sample Data Included

- **3 Locations:** Asaliya Villa, Rusty Bunk, Antiqua Serenity
- **4 Accounts:** Sampath Bank (LKR), Payoneer (USD), Asaliya Cash (LKR), Wishva Account (LKR)
- **Expense Types:** Utilities, Staff, Maintenance, Laundry, Commission, Rent, etc.
- **Demo User:** Full admin access to all locations and features

## Troubleshooting

### If demo user login fails:
1. Check that the user exists in auth.users table
2. Verify email is in allowed_emails table
3. Confirm profile exists with admin role
4. Check user_permissions table for location access

### If features are not accessible:
1. Verify user permissions in user_permissions table
2. Check that locations are marked as active
3. Confirm RLS policies are correctly applied

## Next Steps

After setup is complete:
1. Test login with demo credentials
2. Explore different sections (Dashboard, Income, Expenses, etc.)
3. Add sample reservations and transactions
4. Test reporting and calendar features

The system is now ready for demonstration with a fully configured admin user and sample data structure.