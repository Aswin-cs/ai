import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import "@/models/AiEvaluation";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({
      authenticated: false,
      inDb: false,
      onboardingCompleted: false,
    });
  }

  if (!process.env.MONGODB_URI) {
    return NextResponse.json({
      authenticated: true,
      inDb: false,
      onboardingCompleted: false,
    });
  }

  try {
    await connectToDatabase();
    const dbUser = await User.findOne({ email: session.user.email }).populate("latestAiEvaluation");

    return NextResponse.json({
      authenticated: true,
      inDb: !!dbUser,
      onboardingCompleted: !!dbUser?.onboardingCompleted,
      user: dbUser
        ? {
            id: dbUser._id.toString(),
            name: dbUser.name,
            email: dbUser.email,
            image: dbUser.image,
            defaultLocation: dbUser.defaultLocation,
            householdProfile: dbUser.householdProfile,
            aiPlan: dbUser.aiPlan,
            latestAiEvaluation: dbUser.latestAiEvaluation,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Error in /api/user/status:", error);
    return NextResponse.json(
      {
        authenticated: true,
        inDb: false,
        onboardingCompleted: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
