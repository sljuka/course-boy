import { Card, CardContent } from "@/components/ui/card";

export const CourseLoadingCard = ({ message }: { message: string }) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="py-10 text-sm text-stone-600">
        {message}
      </CardContent>
    </Card>
  );
};
