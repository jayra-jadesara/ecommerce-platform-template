/** Shared Popper config — keeps pickers in the viewport without growing page scroll. */
export const ADMIN_PICKER_POPPER_PROPS = {
  className: "admin-datetime-popper",
  placement: "bottom-start" as const,
  strategy: "fixed" as const,
  modifiers: [
    {
      name: "flip",
      options: {
        fallbackPlacements: ["top-start", "top-end", "bottom-end"],
        padding: 12,
      },
    },
    {
      name: "preventOverflow",
      options: {
        boundary: "viewport" as const,
        altBoundary: true,
        tether: false,
        padding: 12,
      },
    },
    {
      name: "offset",
      options: { offset: [0, 8] },
    },
  ],
};
