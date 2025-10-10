"use client";

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@clerk/nextjs";

const formSchema = z.object({
    title: z.string().min(1, {
        message: "Title is required",
    }),
})

const CreatePage = () => {

    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: ""
        },
    })

    const { isSubmitting, isValid } = form.formState;

    const { getToken } = useAuth();

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
          const token = await getToken();
      
          const response = await axios.post("/api/courses", values, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
      
          router.push(`/dashboard/teacher/courses/${response.data.id}`);
          toast.success("تم إنشاء الكورس");
        } catch {
          toast.error("حدث خطأ");
        }
      };

    return ( 
        <div className="max-w-5xl mx-auto flex md:items-center md:justify-center h-full p-6">
            <div>
                <h1 className="text-2xl">
                    اسم الكورس
                </h1>
                <p className="text-sm text-slate-600">
                    ماذا تريد أن تسمي دورتك؟ لا تقلق، يمكنك تغيير هذا لاحقاً.
                </p>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-8 mt-8"
                    >

                        <FormField

                            control={form.control}
                            name ="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        عنوان الكورس
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            disabled={isSubmitting}
                                            placeholder="e.g. 'تطوير الويب المتقدم'"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        ماذا ستعلم في هذه الكورس؟
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}

                        />

                        <div className="flex items-center gap-x-2">
                            <Link href="/">
                                <Button
                                    variant="ghost"
                                    type="button"
                                >
                                    إلغاء
                                </Button>
                            </Link>
                            <Button
                                type="submit"
                                disabled={!isValid || isSubmitting}
                            >
                                استمر
                            </Button>
                        </div>

                    </form>
                </Form>
            </div>
        </div>
     );
}
 
export default CreatePage;