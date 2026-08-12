# Migrating the Agent Project Into This Account — Safe Plan

This plan covers moving your separate Agent project from the old Lovable
account into this account, then stabilizing it. Share CoreMar is not touched
at any step.

## Important: two things only you can do

1. **Create the destination project.** I cannot create Lovable projects. Open
   your project dashboard and choose **New project**. Everything below then
   happens in that new project's chat, not this one.
2. **Deliver the code.** Your ZIP did not upload (only two PNG images arrived).
   Archives often fail the 20MB upload path, so GitHub is the reliable route.

## Which transfer method to use

| Method | Brings code | Brings DB schema | Brings DB data | Brings secrets / domain / connectors |
|---|---|---|---|---|
| Transfer ownership | Yes (original project moves) | Yes | Yes | No |
| Remix | Yes (a copy) | Structure only | No | No |
| GitHub / ZIP | Yes | No | No | No |

**Recommendation: GitHub.** You told me the ZIP and the GitHub repo hold the
newest code, edited through Codespaces, and that the old Lovable copy is
older. Transfer ownership would move the *outdated* version. So bring in the
newest code and reconnect it to the Supabase database you already built.

Use Transfer ownership only if you later decide the old Lovable project's
history and settings matter more than the newer code.

## Step 1 — Create and seed the new project

1. Create the new project in this account.
2. Give me the GitHub repository URL in the new project's chat. If the repo is
   private, either make it temporarily public or connect Git sync so I can
   read it.
3. I copy the repo contents into the project, excluding all `.git` metadata so
   the project repository is not corrupted.
4. I install dependencies and confirm the app builds and boots.

## Step 2 — Wire up the database

Your Codespaces build already has a working Supabase project with tables. Two
options:

- **Keep your own Supabase** (recommended, no data loss): I read the code's
  expected schema, you supply the project URL and keys as secrets, and I point
  the app at it. Your existing rows survive.
- **Move onto Lovable Cloud**: cleaner integration with this account, but the
  tables must be recreated and existing rows migrated separately.

No table is dropped or recreated without me explaining the reason and getting
your approval first.

## Step 3 — Technical diagnosis (before any repair)

I inspect and report on, without changing anything:

- Environment configuration and how the Supabase client is constructed
- Every table, column, function, trigger, RLS policy and GRANT the code
  expects, compared against what actually exists in your database
- Authentication flow and session handling
- Storage buckets and their access policies
- Build and typecheck errors, plus runtime errors in the browser console

You get a written diagnosis listing each problem and its cause before I edit
anything.

## Step 4 — Repair the known issues you reported

- **Model choice is locked to Lovable's picks.** If the project calls the
  Lovable AI Gateway, the model list is fixed by the gateway. To choose freely,
  the app must call the provider's own API directly using your API key stored
  as a project secret. That removes the family restriction entirely.
- **Chat messages appear twice.** Typically a duplicated send handler, a
  double-registered effect, or an optimistic message that is not reconciled
  with the persisted row. I locate the actual cause in the newest code, since
  you believe Codespaces may already have fixed it.
- **Emergency alert bell does not work.** I trace the trigger path end to end
  and repair whichever link is broken.
- **Microphone does not work in chat.** Usually missing permission handling,
  a non-secure context, or an unstarted speech recognition session.
- **Voice should autoplay on new replies.** The model's answer should be spoken
  automatically, the way Gemini does, without pressing a speaker button.
  Replaying an older message, or a reply to a typed message, stays manual.

## Step 5 — Verify and hand back

I run the build and typecheck, then exercise the important flows in a real
browser: sign-in, chat send and receive, microphone capture, automatic voice
playback, and the emergency alert. I report what was fixed and what was
verified, then you do your own manual testing and send me anything still
broken.

## Constraints I will hold to

- No redesign, no new features — stabilization and repair only
- No destructive database changes
- Share CoreMar in this account stays exactly as it is
