<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Localization
- Use the central `useI18n().tr` back-office vocabulary for displayed admin labels and enum codes; this keeps Egyptian Arabic consistent without changing persisted values.
- Use the shared `ProposedDetails` view for supplier submission fields; merchants must not see raw field-key JSON.
- Admin leaf routes use `backofficeHead` for unique content metadata; this keeps every control-center page identifiable.
