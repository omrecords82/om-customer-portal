import { Anchor } from "@mantine/core";

/** Visually hidden until focused — jumps to primary content landmark. */
export function SkipToContentLink() {
  return (
    <Anchor href="#portal-main" className="om-skip-link" underline="never">
      Skip to content
    </Anchor>
  );
}
