# AIMS Foundation

AIMS AI — STAGE 1

Foundation: Supabase + Authentication + Roles + Profiles + Security

Build Stage 1 of the AIMS AI educational platform.

Do NOT build the test system, question bank, analytics, or AIMS AI analysis yet.

The purpose of Stage 1 is to create a strong and secure foundation that later stages can build on.

1. APPLICATION NAME

Application name:

AIMS AI

Tagline:

Assess. Identify. Improve. Master.

The application is an educational platform for students from Class 1 to Class 10.

2. TECHNOLOGY

Use:

Frontend:

Flutter

Backend:

Supabase

Database:

Supabase PostgreSQL

Authentication:

Supabase Auth

Storage:

Supabase Storage

Do not use a separate backend server for Stage 1 unless absolutely necessary.

3. STAGE 1 OBJECTIVE

Implement these features:

Supabase project connection

Database foundation

Authentication

User roles

Student registration

Teacher registration

Admin role

Student profile

Teacher profile

Profile photo storage

Login

Logout

Password reset

Role-based navigation

Supabase Row Level Security

Secure database policies

Session management

Basic Student Dashboard

Basic Teacher Dashboard

Basic Admin Dashboard

At the end of Stage 1, a student, teacher, and admin should be able to log in and see the correct dashboard.

4. USER ROLES

Create exactly three primary roles:

STUDENT

TEACHER

ADMIN

The role must be stored securely.

Do not allow users to simply modify their role from the Flutter application.

5. AUTHENTICATION

Use Supabase Auth.

Support:

Registration

User enters:

Full name

Email

Password

Role

For students, also collect:

Class/standard

School name

Age/date of birth

Preferred language

For teachers, collect:

Full name

Email

School name

Subject/specialization

Do NOT allow normal users to register themselves as ADMIN.

Admin accounts must be created through a secure administrative process.

6. REGISTRATION FLOW

Student

Open AIMS AI

      ↓

Create Account

      ↓

Select Student

      ↓

Enter personal information

      ↓

Select Class 1–10

      ↓

Create account

      ↓

Supabase Auth

      ↓

Create student profile

      ↓

Student Dashboard

Teacher

Open AIMS AI

      ↓

Create Account

      ↓

Select Teacher

      ↓

Enter teacher information

      ↓

Create account

      ↓

Supabase Auth

      ↓

Create teacher profile

      ↓

Teacher Dashboard

7. LOGIN

Create a clean login screen.

Fields:

Email

Password

Buttons:

Login

Forgot Password?

Create Account

After successful login:

STUDENT → Student Dashboard

TEACHER → Teacher Dashboard

ADMIN → Admin Dashboard

The application should determine the user's role from secure database information.

8. SESSION MANAGEMENT

Use Supabase Auth sessions.

When the application starts:

Check whether the user already has a valid session.

If no session exists, show Login.

If a session exists, retrieve the user's role.

Open the correct dashboard.

When the user logs out:

Clear the local session.

Return to Login.

Do not store passwords locally.

9. FORGOT PASSWORD

Create:

Forgot Password

User enters email.

Supabase sends password-reset instructions.

After reset, the user can log in with the new password.

Show user-friendly success/error messages.

10. DATABASE FOUNDATION

Create the following initial tables:

profiles

students

teachers

schools

user_roles

Keep the database normalized and prepare it for future tables.

Later stages will add:

classes

subjects

topics

questions

tests

test_attempts

analytics

ai_reports

Do not implement those yet unless required for the foundation.

11. PROFILES TABLE

Create a general profiles table.

Suggested fields:

id UUID PRIMARY KEY

full_name TEXT

email TEXT

phone TEXT NULL

avatar_url TEXT NULL

role TEXT

created_at TIMESTAMPTZ

updated_at TIMESTAMPTZ

The id should correspond to the authenticated user's ID.

Use UUID.

Do not store passwords in this table.

12. USER ROLES TABLE

Create:

user_roles

Fields:

id UUID

user_id UUID

role TEXT

created_at TIMESTAMPTZ

Allowed roles:

student

teacher

admin

The role must be validated.

Do not allow a normal client request to arbitrarily change its own role.

13. STUDENTS TABLE

Create:

students

Fields:

id UUID

user_id UUID

full_name TEXT

class_level INTEGER

school_id UUID NULL

age INTEGER NULL

date_of_birth DATE NULL

preferred_language TEXT

avatar_url TEXT NULL

created_at TIMESTAMPTZ

updated_at TIMESTAMPTZ

Class level must only accept:

1

2

3

4

5

6

7

8

9

10

Validate this in the database as well as the frontend.

14. TEACHERS TABLE

Create:

teachers

Fields:

id UUID

user_id UUID

full_name TEXT

school_id UUID NULL

specialization TEXT NULL

avatar_url TEXT NULL

created_at TIMESTAMPTZ

updated_at TIMESTAMPTZ

A teacher belongs to their authenticated user account.

15. SCHOOLS TABLE

Create a basic schools table for future scalability.

Fields:

id UUID

name TEXT

address TEXT NULL

city TEXT NULL

state TEXT NULL

country TEXT DEFAULT 'India'

created_at TIMESTAMPTZ

updated_at TIMESTAMPTZ

Do not require school creation during normal student registration.

Allow the architecture to support school assignment later.

16. DATABASE RELATIONSHIPS

Create relationships:

Auth User

   │

   ├── Profile

   │

   ├── Student

   │      └── School

   │

   └── Teacher

          └── School

Use foreign keys wherever appropriate.

Do not duplicate authentication credentials.

17. AUTOMATIC PROFILE CREATION

When a user registers:

Supabase Auth creates the authentication user.

Create the corresponding profile.

Create either:

student record

teacher record

Assign the correct role.

Make this reliable and prevent partial/inconsistent accounts.

If using a database trigger, ensure it is secure and does not trust arbitrary client-supplied role escalation.

18. STUDENT PROFILE SCREEN

Create:

My Profile

Show:

Profile picture

Full name

Email

Class

School

Age/date of birth if collected

Preferred language

Buttons:

Edit Profile

Change Password

Logout

Student can edit only permitted fields belonging to their own profile.

19. TEACHER PROFILE SCREEN

Show:

Profile picture

Full name

Email

School

Specialization

Buttons:

Edit Profile

Change Password

Logout

Teacher can edit only their own permitted information.

20. PROFILE PHOTO

Use Supabase Storage.

Create a storage bucket for profile images.

Example:

avatars/

   user-id/

      profile.jpg

Users should only be able to upload/update their own profile image.

Validate:

File type

File size

File path

Do not expose unnecessary storage permissions.

21. STUDENT DASHBOARD — STAGE 1

Do not show test analytics yet because those belong to later stages.

Create a basic dashboard:

Hello, Rahul 👋

Class 7

Welcome to AIMS AI

┌──────────────────────────┐

│ Your Learning Journey    │

│                          │

│ Tests: Coming Soon       │

│ Progress: Coming Soon    │

│ AIMS AI: Coming Soon     │

└──────────────────────────┘

[ My Profile ]

[ Logout ]

The UI should already have placeholders for future functionality.

22. TEACHER DASHBOARD — STAGE 1

Create:

Welcome, Teacher 👋

AIMS AI Teacher Dashboard

┌──────────────────────────┐

│ Students       Coming Soon│

│ Tests          Coming Soon│

│ Analytics      Coming Soon│

│ AIMS AI        Coming Soon│

└──────────────────────────┘

[ My Profile ]

[ Logout ]

Later stages will replace these placeholders with actual functionality.

23. ADMIN DASHBOARD — STAGE 1

Create a basic Admin Dashboard.

Show:

Welcome, Admin

AIMS AI Administration

Users

Schools

Teachers

Students

Stage 1 Foundation Active

Do not expose admin functions to students or teachers.

24. ROLE-BASED ROUTING

Implement route protection.

Example:

/login

/register

/student/dashboard

/student/profile

/teacher/dashboard

/teacher/profile

/admin/dashboard

Rules:

Student trying to access:

/admin/dashboard

must be rejected.

Teacher trying to access:

/student/dashboard

must be rejected unless the route is explicitly intended to be shared.

Admin can access authorized administrative routes.

25. SUPABASE ROW LEVEL SECURITY

Enable RLS on all user-related tables.

This is mandatory.

Student

A student can read/update only their own profile/student record.

They cannot read another student's data.

Teacher

A teacher can read/update only their own teacher/profile information.

Future teacher access to students will be added through properly defined class relationships in later stages.

Admin

Admin can manage authorized platform data.

Do not simply create a policy saying:

authenticated users can do everything

Do not use insecure policies.

26. ROLE SECURITY

Never trust:

role = "admin"

sent from the Flutter client.

Role must be controlled by secure backend/database logic.

A student must not be able to change:

student → admin

by modifying a request.

Use secure role validation and RLS.

27. AUTH STATE

Create a centralized authentication state system.

The application should know:

isLoading

isAuthenticated

currentUser

currentRole

When auth state changes:

Login → open correct dashboard

Logout → open login

Session expired → open login

Registration → open appropriate onboarding/dashboard

Avoid duplicating authentication logic across screens.

28. UI DESIGN

Use a modern educational design.

Application:

AIMS AI

Student UI:

Friendly

Simple

Clean

Easy for Class 1–10 students

Teacher UI:

Professional

Clean

Dashboard-based

Admin UI:

Professional

Management-focused

Use reusable:

Buttons

Cards

Text fields

App bars

Navigation

Dialogs

Loading indicators

Error messages

29. RESPONSIVE DESIGN

The application should work properly on:

Android phones

Tablets

Desktop/web where supported

Do not create fixed layouts that break on different screen sizes.

30. VALIDATION

Validate registration fields.

Examples:

Name:

Required.

Email:

Valid email format.

Password:

Follow secure password requirements.

Class:

Required for student.

Class must be between:

1 and 10.

Teacher specialization:

Optional.

Do both:

Frontend validation

Database/server validation where appropriate

Never rely only on frontend validation.

31. ERROR HANDLING

Handle:

Invalid email

Wrong password

Existing email

Weak password

Network failure

Session expiration

Database failure

Image upload failure

Use understandable messages.

Do not display raw database errors to students.

32. LOADING STATES

Every asynchronous operation should have a loading state.

Examples:

Login:

Signing in...

Registration:

Creating your account...

Profile update:

Saving...

Image upload:

Uploading...

Do not allow duplicate submissions while an operation is in progress.

33. EMPTY STATES

Create proper empty states.

Example:

No tests yet.

Your teacher will assign tests here.

Even though tests are not implemented in Stage 1, prepare reusable empty-state components.

34. SECURITY REQUIREMENTS

Never store:

Passwords

Gemini API key

Supabase service-role key

inside the Flutter application.

Never commit secret keys to Git.

Use environment variables for public configuration and secure server-side secrets for sensitive credentials.

For Stage 1, Gemini integration is NOT required yet.

35. PROJECT STRUCTURE

Use clean Flutter architecture.

Example:

lib/

  core/

    theme/

    constants/

    utils/

    errors/

  config/

    supabase_config/

  features/

    auth/

      data/

      models/

      services/

      screens/

      widgets/

    student/

      models/

      screens/

      widgets/

    teacher/

      models/

      screens/

      widgets/

    admin/

      models/

      screens/

      widgets/

    profile/

      screens/

      widgets/

  shared/

    widgets/

    components/

  main.dart

Do not put the entire application in one file.

36. SUPABASE CONFIGURATION

Connect Flutter to Supabase using the correct public client configuration.

Never place a Supabase service-role key in the frontend.

Use the Supabase client only with credentials intended for client-side use.

37. DATABASE MIGRATIONS

Create SQL migration scripts for:

profiles

user_roles

students

teachers

schools

RLS policies

required indexes

required constraints

Do not manually create tables without recording the schema.

The database should be reproducible.

38. SEED DATA

Create optional development seed data.

Example:

Admin

Teacher

Student

School

Clearly mark seed accounts as development/test accounts.

Do not use insecure default passwords in production.

39. STAGE 1 TESTING

Test the following scenarios.

Student

Register

↓

Login

↓

Student Dashboard

↓

Profile

↓

Edit profile

↓

Upload profile photo

↓

Logout

↓

Login again

Teacher

Register

↓

Login

↓

Teacher Dashboard

↓

Profile

↓

Edit profile

↓

Logout

Admin

Admin login

↓

Admin Dashboard

40. SECURITY TESTING

Verify:

Student cannot:

Read another student's profile

Modify another student's profile

Become teacher

Become admin

Access teacher dashboard

Access admin dashboard

Teacher cannot:

Modify another teacher's profile

Become admin

Access admin dashboard

Access unauthorized student data

Admin:

Can access authorized administrative data.

41. STAGE 1 COMPLETION CHECKLIST

Stage 1 is complete only when:

[ ] Supabase connected

[ ] PostgreSQL database created

[ ] Supabase Auth working

[ ] Student registration working

[ ] Teacher registration working

[ ] Admin authentication working

[ ] Student profile working

[ ] Teacher profile working

[ ] Profile photo upload working

[ ] Login working

[ ] Logout working

[ ] Password reset working

[ ] Role detection working

[ ] Role-based routing working

[ ] RLS enabled

[ ] RLS tested

[ ] Students isolated from other students

[ ] Teachers isolated from unauthorized data

[ ] Admin routes protected

[ ] Error handling implemented

[ ] Loading states implemented

[ ] Responsive UI implemented

[ ] Database migrations created

[ ] Clean Flutter architecture implemented

42. DO NOT IMPLEMENT YET

Do NOT implement these in Stage 1:

Tests

Questions

Question bank

Test timer

Question timing

Test submission

Test scoring

Student analytics

Class analytics

Before/after improvement

Early warning

Teacher reports

AIMS AI analysis

Gemini API integration

Practice tests

Improvement tests

These belong to later stages.

43. PREPARE FOR FUTURE STAGES

The Stage 1 architecture must make it easy to add:

Stage 2:

Academic structure + Question Bank

Stage 3:

Test creation + Test assignment + Student testing

Stage 4:

Timing + Analytics

Stage 5:

AIMS AI

Stage 6:

Improvement system

Stage 7:

Advanced reports + Early warning + notifications

Do not create temporary architecture that must be completely rewritten later.

44. FINAL STAGE 1 USER EXPERIENCE

Student

AIMS AI

Welcome 👋

Student Registration

        ↓

Student Profile

        ↓

Student Dashboard

Teacher

AIMS AI

Welcome 👋

Teacher Registration

        ↓

Teacher Profile

        ↓

Teacher Dashboard

Admin

AIMS AI

Admin Login

        ↓

Admin Dashboard

The three roles must remain completely separated through authentication, authorization, routing and database security.

FINAL INSTRUCTION

Build only Stage 1 now.

First create the Supabase database schema and security policies.

Then connect Flutter.

Then implement authentication.

Then implement role detection.

Then implement Student, Teacher and Admin profiles.

Then implement the three dashboards.

Then test authentication and RLS thoroughly.

Do not move to Stage 2 until Stage 1 is working correctly.

The application must be modular, secure, scalable and ready for the future AIMS AI testing and performance-analysis features.AIMS AI — STAGE 2

Academic Structure + Classes + Subjects + Topics + Question Bank

Continue building the existing AIMS AI application from Stage 1.

Do NOT rebuild Stage 1.

Use the existing:

Flutter application

Supabase Authentication

Supabase PostgreSQL

Supabase Storage

Student/Teacher/Admin roles

Profiles

Row Level Security

Role-based navigation

Stage 2 adds the academic content structure and Question Bank.

1. STAGE 2 OBJECTIVE

Build the following:

School management foundation

Class management

Teacher-class relationship

Student-class relationship

Subject management

Topic management

Question Bank

Question creation

Question editing

Question deletion

Question preview

Question filtering

Question search

Difficulty levels

Question explanations

Question validation

Teacher Question Bank UI

Admin academic-content management

Do NOT build the student test-taking system yet.

Do NOT build the test timer yet.

Do NOT build AIMS AI analysis yet.

2. ACADEMIC STRUCTURE

The main academic hierarchy should be:

School

   ↓

Class

   ↓

Subject

   ↓

Topic

   ↓

Question

Example:

ABC School

   ↓

Class 7

   ↓

Mathematics

   ↓

Fractions

   ↓

Questions

Another example:

ABC School

   ↓

Class 8

   ↓

Science

   ↓

Force and Pressure

   ↓

Questions

This structure must be stored properly in Supabase PostgreSQL.

3. SCHOOL

Use the schools table created in Stage 1.

Allow Admin to:

Create school

Edit school

View school

Disable/archive school

School information:

School name

Address

City

State

Country

Created date

Status

Status:

ACTIVE

INACTIVE

Students and teachers can later be associated with schools.

4. CLASS MANAGEMENT

Create a proper classes table.

Suggested fields:

id UUID PRIMARY KEY

school_id UUID

name TEXT

class_level INTEGER

section TEXT NULL

academic_year TEXT

created_by UUID

created_at TIMESTAMPTZ

updated_at TIMESTAMPTZ

status TEXT

Examples:

Class 1A

Class 1B

Class 7A

Class 7B

Class 10A

Class level must be:

1–10.

5. CLASS CREATION

Teacher should be able to create a class if they have permission.

Example UI:

Create Class

Class:

[ 7 ]

Section:

[ A ]

Academic Year:

[ 2026–27 ]

[ Create Class ]

After creation:

Class 7A

Teacher can open the class.

6. CLASS DASHBOARD

Teacher selects:

My Classes

      ↓

Class 7A

Show:

Class 7A

Students: 35

Subjects:

Mathematics

Science

English

[ Students ]

[ Subjects ]

[ Manage Class ]

Analytics should NOT be implemented yet.

Only show academic structure.

7. TEACHER-CLASS RELATIONSHIP

Create a relationship between teachers and classes.

Recommended table:

teacher_classes

Fields:

id UUID

teacher_id UUID

class_id UUID

created_at TIMESTAMPTZ

This allows one teacher to teach multiple classes.

Example:

Mr. Sharma

   ↓

Class 7A

Class 7B

Class 8A

A class can also have multiple teachers.

8. STUDENT-CLASS RELATIONSHIP

Create:

class_students

Fields:

id UUID

class_id UUID

student_id UUID

joined_at TIMESTAMPTZ

status TEXT

Status:

ACTIVE

INACTIVE

This allows the same architecture to support students moving between classes over academic years.

9. ADD STUDENT TO CLASS

Teacher should have:

Class 7A

   ↓

Students

   ↓

Add Student

Teacher can search by:

Student name

Email

Student ID

Then add the student.

Example:

Search Student

Rahul

Class:

7A

[ Add to Class ]

Do not allow unauthorized teachers to add students to classes they do not manage.

10. CLASS STUDENT LIST

Teacher should see:

Class 7A

Students: 35

1. Rahul

2. Amit

3. Priya

4. Sneha

5. Akash

...

At this stage, clicking a student should show their basic profile only.

Detailed performance will be implemented later.

11. SUBJECT MANAGEMENT

Create:

subjects

Fields:

id UUID

name TEXT

description TEXT NULL

class_level INTEGER

created_at TIMESTAMPTZ

updated_at TIMESTAMPTZ

status TEXT

Examples:

Mathematics

Science

English

Social Science

Hindi

Marathi

Subjects should be associated with appropriate class levels.

12. SUBJECT PAGE

Teacher opens:

Class 7A

   ↓

Mathematics

Show:

Mathematics

Topics:

Numbers

Fractions

Decimals

Algebra

Geometry

Mensuration

Probability

Buttons:

[ Add Topic ]

[ Manage Questions ]

13. TOPIC MANAGEMENT

Create:

topics

Fields:

id UUID

subject_id UUID

name TEXT

description TEXT NULL

created_at TIMESTAMPTZ

updated_at TIMESTAMPTZ

status TEXT

Example:

Mathematics

    ↓

Fractions

    ↓

Fraction Addition

Fraction Subtraction

Fraction Comparison

Keep the initial design flexible enough to support subtopics later.

14. TOPIC CREATION

Teacher/Admin can create topics where authorized.

Example:

Create Topic

Subject:

Mathematics

Topic:

Fractions

Description:

Understanding and solving fraction problems.

[ Save Topic ]

15. QUESTION BANK

This is the main feature of Stage 2.

Create:

questions

and, if needed:

question_options

The Question Bank should be reusable.

Teachers should be able to create questions once and later use them in multiple tests.

16. QUESTION DATABASE

Each question should store:

id UUID

class_level INTEGER

subject_id UUID

topic_id UUID

question_text TEXT

question_type TEXT

difficulty TEXT

marks NUMERIC

explanation TEXT NULL

created_by UUID

created_at TIMESTAMPTZ

updated_at TIMESTAMPTZ

status TEXT

Question status:

DRAFT

ACTIVE

ARCHIVED

17. QUESTION TYPES

Initially support:

MCQ

Multiple Choice Question

Example:

What is 2 + 2?

A. 3

B. 4

C. 5

D. 6

TRUE/FALSE

Example:

The Earth revolves around the Sun.

True

False

Design the database so future question types can be added:

Multiple answer

Fill in the blank

Short answer

Numerical answer

Do not implement all advanced types now.

18. QUESTION OPTIONS

For MCQ questions create:

question_options

Fields:

id UUID

question_id UUID

option_text TEXT

option_order INTEGER

is_correct BOOLEAN

created_at TIMESTAMPTZ

Example:

Question:

What is 2 + 2?

Option 1:

3

is_correct = false

Option 2:

4

is_correct = true

Option 3:

5

is_correct = false

Option 4:

6

is_correct = false

19. QUESTION CREATION SCREEN

Teacher selects:

Create Question

Show:

Class:

[ Class 7 ▼ ]

Subject:

[ Mathematics ▼ ]

Topic:

[ Fractions ▼ ]

Question Type:

[ MCQ ▼ ]

Difficulty:

[ Medium ▼ ]

Marks:

[ 1 ]

Question:

[ Enter question here ]

Options:

A. [ option ]

B. [ option ]

C. [ option ]

D. [ option ]

Correct Answer:

[ Select ]

Explanation:

[ Enter explanation ]

Buttons:

[ Save Draft ]

[ Save Question ]

---

20. QUESTION VALIDATION

Before saving an MCQ:

Require:

- Question text

- Class

- Subject

- Topic

- At least 2 options

- Correct answer

- Difficulty

- Marks

Do not allow:

- Empty question

- No correct answer

- Multiple correct answers for a single-answer MCQ

- Duplicate option IDs

- Invalid class level

Validate on both frontend and backend/database where appropriate.

---

21. QUESTION EXPLANATION

Every question should support an explanation.

Example:

Question:

What is 2/3 + 1/3?

Correct answer:

1

Explanation:

"Both fractions have the same denominator. Add the numerators: 2 + 1 = 3. Therefore 3/3 = 1."

This explanation will later be useful for:

- Student result

- Practice

- AIMS AI

- Improvement learning

---

22. DIFFICULTY

Support:

```text

EASY

MEDIUM

HARD

Teacher selects the difficulty while creating a question.

Later the application can use this information for:

Test generation

Adaptive testing

AIMS AI

Improvement tests

Do not implement adaptive testing yet.

23. QUESTION BANK SCREEN

Create a professional teacher Question Bank.

Example:

Question Bank

[ Search questions... ]

Filters:

Class: [7 ▼]

Subject: [Mathematics ▼]

Topic: [Fractions ▼]

Difficulty: [All ▼]

Status: [Active ▼]

List:

Question                     Topic       Difficulty

1   What is 2/3 + 1/3?           Fractions   Easy

2   Find 3/4 of 20.              Fractions   Medium

3   Solve x + 5 = 12.            Algebra     Easy

24. QUESTION SEARCH

Teacher can search questions by:

Question text

Topic

Subject

Class

Difficulty

Search should be efficient and use server-side queries.

Do not load the entire question database into Flutter.

25. QUESTION FILTER

Allow filters:

Class

Subject

Topic

Difficulty

Question Type

Status

Created By

This will become important when the Question Bank grows.

26. QUESTION PREVIEW

Teacher can click a question.

Show:

Question Preview

Class: 7

Subject: Mathematics

Topic: Fractions

Difficulty: Medium

Marks: 1

What is 2/3 + 1/3?

A. 1

B. 2/3

C. 1/3

D. 3/6

Correct Answer:

A

Explanation:

...

The preview should look similar to the future student test UI.

27. EDIT QUESTION

Teacher can edit questions they are authorized to manage.

Allow:

Change question

Change options

Change correct answer

Change explanation

Change difficulty

Change topic

Change marks

However, prepare the architecture so that once a question is used in a published test, future stages can preserve a snapshot of the original question.

Do not break historical test data later.

28. DELETE QUESTION

Do not permanently delete important question data if it may later be referenced by tests.

Prefer:

ACTIVE

ARCHIVED

instead of destructive deletion.

Teacher can archive a question.

Archived questions should not appear in new test creation by default.

29. DUPLICATE QUESTION

Add an optional useful feature:

Duplicate Question

Teacher clicks:

Duplicate

A copy is created as a draft.

This allows the teacher to modify it without changing the original question.

30. ADMIN CONTENT MANAGEMENT

Admin should be able to manage:

Schools

Classes

Subjects

Topics

Questions

Admin can:

Create

Edit

Archive

View

Admin has broader permissions than teachers.

31. TEACHER PERMISSIONS

Teachers should only manage content they are authorized to manage.

For example:

Teacher A:

Class 7A

Class 7B

Teacher A should not automatically be able to manage:

Class 10A

unless authorized.

Enforce this with Supabase RLS and database relationships.

32. ROW LEVEL SECURITY

Update RLS policies.

Students:

Can read their own class membership.

Cannot create/edit academic content.

Cannot create questions.

Cannot modify questions.

Teachers:

Can manage their authorized classes.

Can manage authorized subjects/topics/questions according to permissions.

Admins:

Can manage academic structure.

Never rely only on Flutter UI restrictions.

33. DATABASE INDEXES

Create indexes for frequently searched fields.

Examples:

students.user_id

classes.school_id

classes.class_level

teacher_classes.teacher_id

teacher_classes.class_id

class_students.student_id

class_students.class_id

subjects.class_level

topics.subject_id

questions.class_level

questions.subject_id

questions.topic_id

questions.difficulty

questions.status

Use indexes appropriately without over-indexing.

34. ACADEMIC CONTENT FLOW

The complete Stage 2 flow should work like:

Admin/Teacher

      ↓

Create School

      ↓

Create Class

      ↓

Assign Teacher

      ↓

Add Students

      ↓

Create Subject

      ↓

Create Topic

      ↓

Create Question

      ↓

Add Options

      ↓

Set Correct Answer

      ↓

Set Difficulty

      ↓

Add Explanation

      ↓

Save Question

      ↓

Question appears in Question Bank

35. STUDENT EXPERIENCE IN STAGE 2

Students do NOT create questions.

Students can see only their basic academic information.

If appropriate, display:

My Class

Class 7A

My Subjects

Mathematics

Science

English

Do not implement test functionality yet.

36. TEACHER EXPERIENCE

Teacher navigation should now contain:

Dashboard

Classes

Students

Subjects

Question Bank

Profile

Tests should remain:

Coming Soon

because Test Creation belongs to Stage 3.

37. ADMIN EXPERIENCE

Admin navigation:

Dashboard

Schools

Classes

Teachers

Students

Subjects

Topics

Question Bank

Profile

Admin should be able to manage the academic structure.

38. EMPTY STATES

Create useful empty states.

Example:

No questions:

No questions found.

Create your first question to build

your Question Bank.

[ Create Question ]

No students:

No students added to this class.

[ Add Student ]

No topics:

No topics created.

[ Add Topic ]

39. LOADING STATES

All database operations must have loading states.

Examples:

Loading classes...

Loading questions...

Saving question...

Updating topic...

Prevent duplicate actions while saving.

40. ERROR HANDLING

Handle:

Database error

Permission error

Invalid question

Network failure

Duplicate data

Unauthorized action

Missing topic

Missing subject

Invalid class

Show friendly messages.

Never expose raw database errors unnecessarily.

41. PAGINATION

Question Bank may eventually contain thousands of questions.

Implement pagination.

Example:

Showing 1–20 of 350 questions

[ Previous ] [ 1 ] [ 2 ] [ 3 ] [ Next ]

Use server-side pagination.

42. QUESTION OWNERSHIP

Store:

created_by

in the questions table.

This allows the system to know which teacher/admin created the question.

Later this will help with:

Teacher Question Bank

Audit logs

Permissions

Reports

43. AUDIT LOGGING

Use the existing audit system from Stage 1.

Log:

Question created

Question edited

Question archived

Topic created

Subject created

Class created

Student added to class

Student removed from class

Store:

User ID

Action

Entity type

Entity ID

Timestamp

44. UI DESIGN

Keep the AIMS AI design system from Stage 1.

Teacher Question Bank should be professional.

Use:

Cards

Tables

Search

Filters

Dropdowns

Dialogs

Pagination

Clear buttons

Student UI should remain simple.

45. RESPONSIVE DESIGN

Support:

Mobile

Tablet

Desktop/web

Teacher Question Bank should work particularly well on desktop/tablet.

Question creation should remain usable on mobile.

46. DATABASE MIGRATION

Create a new migration for Stage 2.

Include:

classes

teacher_classes

class_students

subjects

topics

questions

question_options

Add:

Primary keys

Foreign keys

Constraints

Indexes

RLS

Policies

Do not modify Stage 1 tables unnecessarily.

47. TEST DATA

Create optional development seed data:

School:

ABC School

Classes:

7A

7B

Subjects:

Mathematics

Science

English

Topics:

Fractions

Algebra

Geometry

Example questions:

5–10 questions per topic.

Clearly mark seed data as development data.

48. STAGE 2 TESTING

Test this complete scenario:

Admin login

   ↓

Create School

   ↓

Create Class 7A

   ↓

Create Subject Mathematics

   ↓

Create Topic Fractions

Then:

Teacher login

   ↓

Access Class 7A

   ↓

Add Student

   ↓

Create Question

   ↓

Select Mathematics

   ↓

Select Fractions

   ↓

Add MCQ options

   ↓

Select correct answer

   ↓

Set difficulty

   ↓

Add explanation

   ↓

Save

Then verify:

Question Bank

      ↓

Question appears

      ↓

Search works

      ↓

Filter works

      ↓

Preview works

      ↓

Edit works

      ↓

Archive works

49. SECURITY TESTING

Verify:

Student cannot:

Create questions

Edit questions

Delete questions

Create classes

Change teacher permissions

Access unauthorized academic content

Teacher cannot:

Modify classes they do not manage

Access unauthorized students

Modify another teacher's restricted content

Become Admin

Admin can:

Manage authorized academic structure

50. DO NOT IMPLEMENT YET

Do NOT implement:

Test creation

Test assignment

Test taking

Timer

Question timing

Auto-save test answers

Test submission

Test scoring

Student result

AIMS AI

Gemini API

Before/after analysis

Early warning

Advanced analytics

Teacher reports

Those belong to later stages.

51. PREPARE FOR STAGE 3

Stage 3 will use the Question Bank created here.

The future flow will be:

Teacher

   ↓

Create Test

   ↓

Select Class

   ↓

Select Subject

   ↓

Select Questions

   ↓

Configure Test

   ↓

Publish

   ↓

Assign to Students

Therefore, make sure questions have stable IDs and proper relationships.

52. FINAL STAGE 2 SUCCESS CRITERIA

Stage 2 is complete when:

[ ] School management foundation works

[ ] Classes work

[ ] Teacher-class relationships work

[ ] Student-class relationships work

[ ] Subjects work

[ ] Topics work

[ ] Question Bank works

[ ] MCQ creation works

[ ] True/False creation works

[ ] Question options work

[ ] Correct answer works

[ ] Difficulty works

[ ] Explanation works

[ ] Search works

[ ] Filters work

[ ] Pagination works

[ ] Question preview works

[ ] Edit works

[ ] Archive works

[ ] Teacher permissions work

[ ] Admin permissions work

[ ] Student restrictions work

[ ] RLS policies work

[ ] Audit logging works

[ ] Database indexes exist

[ ] Responsive UI works

[ ] Stage 1 functionality remains working

FINAL INSTRUCTION

Continue from the existing Stage 1 implementation.

Do not rebuild the project from scratch.

First create and apply the Stage 2 database migration.

Then implement:

Classes

Teacher-class relationships

Student-class relationships

Subjects

Topics

Question Bank

Question creation

Question management

Search/filter/pagination

Permissions and RLS

Testing

Do not move to Stage 3 until the complete Stage 2 flow works.

The final Stage 2 result should allow a teacher to build a complete academic Question Bank that will be used by the test system in Stage 3.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/84546708-5594-48bb-8e82-d08905d686d8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
