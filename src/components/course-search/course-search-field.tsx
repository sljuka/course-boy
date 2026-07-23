import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

export const CourseSearchField = ({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) => {
  return (
    <label className="relative block">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
      />
      <Input
        className="h-13 rounded-2xl border-stone-300/90 bg-white/80 pl-12 text-base"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
};
