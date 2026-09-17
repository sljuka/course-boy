import { Card, CardContent, CardDescription } from "@/components/ui/card";

export const CourseLoadingCard = ({ message }: { message: string }) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="py-10">
        <CardDescription>{message}</CardDescription>
      </CardContent>
    </Card>
  );
};
