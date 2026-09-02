# Restore reliable Super Admin access

## Confirmed starting point
- The published site and preview use the same live authentication backend; publishing is not required for a backend password reset itself.
- A real browser sign-in on the published site succeeded with `sharecoremar@gmail.com` and the password previously issued, landing on `/admin` with no console errors.
- The current login page has no forgot-password action or public reset-password page.

## Implementation
1. Add a “Forgot password?” action to the sign-in form that sends a recovery email to the entered address and clearly reports success or failure.
2. Add a public `/reset-password` page that accepts recovery links, validates recovery state, lets the user set and confirm a new password, and then returns them to sign-in.
3. Add route-specific metadata for both auth pages and keep the existing visual design.
4. Test the recovery request and reset page behavior in a browser, re-test live Super Admin sign-in, then run the security pre-publish check and publish the recovery-flow update.

## Technical details
- Recovery emails use the existing managed authentication service with a redirect to `/reset-password`.
- The reset form only updates the password from a valid recovery session and never asks for the current password.
- No roles, user records, commerce data, or authorization policies will be changed.
