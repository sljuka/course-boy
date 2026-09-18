// Built-in SVG maps a teacher can pick instead of uploading their own file.
// The list is shared between the renderer (rendering the preset buttons) and
// the main process (validating a preset id and finding its bundled file, in
// `getBundledSvgPresetPath` in electron/course-paths.ts) so there is exactly
// one place that knows what presets exist.
export type RegionPickerSvgPreset = {
  filename: string;
  id: string;
  label: string;
};

export const regionPickerSvgPresets: RegionPickerSvgPreset[] = [
  { filename: "europe.svg", id: "europe", label: "Europe" },
  { filename: "africa.svg", id: "africa", label: "Africa" },
];
