# Portal implementation rules

- Use Mantine only for layout, surfaces, typography, spacing, and responsive shell structure.
- Use `@om/ui` for shared interactive controls whenever the component exists.
- Use React Aria Components only for Portal-specific interaction gaps not yet covered by `@om/ui`.
- Do not add MUI, Emotion, Radix UI, Tailwind CSS, shadcn, Chakra UI, Ant Design, or Bootstrap.
- Do not import source code from the legacy OM portal.
- Use OM tokens and centralized theme configuration. Do not scatter raw brand colors through feature code.
- Keep `/portal` as deployment configuration only. Source names must use `customer-portal` or `portal`.
