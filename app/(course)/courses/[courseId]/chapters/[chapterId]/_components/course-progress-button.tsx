import { Chapter } from "@prisma/client";

interface CourseProgressButtonProps {
  chapter: Chapter;
}

export const CourseProgressButton = ({
  chapter
}: CourseProgressButtonProps) => {
  return (
    <div>
      <div className="text-xl font-semibold mb-4">
        {chapter.title}
      </div>
              <div className="prose prose-sm max-w-none space-y-4">
        <div dangerouslySetInnerHTML={{ __html: chapter.description! }} />
      </div>
    </div>
  );
}; 