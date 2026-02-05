import { NextResponse } from "next/server";
import { testBunnyStreamCredentials } from "@/lib/bunny-stream-test";

export async function GET() {
  try {
    const result = await testBunnyStreamCredentials();
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: `Error testing credentials: ${error.message}`,
      },
      { status: 500 }
    );
  }
}

