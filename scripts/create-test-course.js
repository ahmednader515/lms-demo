const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    try {
        // First, let's check if there are any users
        const users = await prisma.user.findMany({
            take: 1
        });

        if (users.length === 0) {
            console.log("No users found. Please create a user first.");
            return;
        }

        const userId = users[0].id;

        // Create a test course
        const course = await prisma.course.create({
            data: {
                userId: userId,
                title: "كورس الرياضيات للصف الأول الثانوي",
                description: "كورس شامل في الرياضيات للصف الأول الثانوي يغطي جميع أجزاء المنهج",
                imageUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=600&fit=crop",
                price: 0,
                isPublished: true,
            }
        });

        console.log("Created test course:", course);

        // Create a test chapter
        const chapter = await prisma.chapter.create({
            data: {
                courseId: course.id,
                title: "الفصل الأول: الجبر",
                description: "مقدمة في الجبر والعمليات الجبرية",
                position: 1,
                isPublished: true,
                isFree: true,
            }
        });

        console.log("Created test chapter:", chapter);

        console.log("Test course and chapter created successfully!");
        console.log("Course ID:", course.id);
        console.log("Chapter ID:", chapter.id);

    } catch (error) {
        console.error("Error creating test course:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main(); 