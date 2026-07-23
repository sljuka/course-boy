import { Card, CardContent } from "@/components/ui/card";

export const CourseErrorCard = ({ message }: { message: string }) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="py-10 text-sm text-rose-700">
        {message}
      </CardContent>
    </Card>
  );
};
