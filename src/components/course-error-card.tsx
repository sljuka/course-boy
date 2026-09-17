import { Card, CardContent, CardDescription } from "@/components/ui/card";

export const CourseErrorCard = ({ message }: { message: string }) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="py-10">
        <CardDescription className="text-destructive">{message}</CardDescription>
      </CardContent>
    </Card>
  );
};
