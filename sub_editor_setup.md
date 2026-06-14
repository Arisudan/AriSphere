# Supabase Sub-Editor Setup Guide

This guide outlines the step-by-step instructions for creating sub-editor user accounts for **AriSphere** using the Supabase Dashboard. 

In accordance with security requirements, user credentials must **NEVER** be directly inserted into `auth.users` or `auth.identities` via direct SQL. Instead, Supabase handles user creation internally via the Dashboard or Admin API.

---

## Step 1: Access the Supabase Dashboard
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project: **excffhqcwzfnexflqzqv**.

## Step 2: Navigate to Authentication
1. In the left-hand sidebar, click on **Authentication** (the key icon).
2. Select **Users** under the Authentication menu.

## Step 3: Add Sub-Editor Accounts
For each of the sub-editors (e.g., `sub1` through `sub5`), perform the following:
1. Click the **Add User** dropdown button on the top right, and select **Create User**.
2. Set the user details:
   - **Email**: `sub1@arisphere.com` (use `sub2@arisphere.com`, `sub3@arisphere.com`, etc. for placeholders).
   - **Password**: Enter a secure password.
3. Toggle **Auto-confirm User** to `ON` (checked) so that the user does not need to verify their email address before logging in.
4. Click **Create User**.

---

> [!IMPORTANT]
> **Profile Auto-Creation & Display Names**:
> The database has an active trigger (`on_auth_user_created` calling `public.handle_new_user()`).
> When you create the users above, the trigger will automatically:
> 1. Check if the email follows the `sub%@arisphere.com` format.
> 2. Create a profile in `public.profiles` with:
>    - `role = 'sub_editor'`
>    - `username = sub1` (extracted from the email prefix)
>    - `full_name = 'Jamuna U'` (custom mapped specifically for **sub1**) or `'Sub Editor X'` (fallback for others).
>    - `avatar = '/assets/images/author.png'`

---

## Step 4: Verify Profile Auto-Creation
To verify that the database trigger worked successfully:
1. Navigate to **Table Editor** (the table grid icon) in the left sidebar.
2. Select the `profiles` table under the `public` schema.
3. Confirm that a new row has been added containing:
   - The generated user UUID.
   - The correct sub-editor role (`sub_editor`).
   - The correct username matching the email prefix.
   - The mapped display name (e.g., `Jamuna U` for `sub1@arisphere.com`).

---

> [!NOTE]
> **Sub-Editor Login Credentials**:
> Once created, sub-editors can log into the editor portal at `/admin` using their registered email and password. Their workspace will automatically adapt to show their customized dashboard KPIs, filter the article catalog to their own creations, lock down the author dropdown, and restrict publish/flag options.
