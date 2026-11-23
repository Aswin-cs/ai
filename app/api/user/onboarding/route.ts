import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in to save your air profile." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { locationQuery, coords, householdProfile, airQualityData, aiPlan } = body;

    await connectToDatabase();

    const locationData = {
      name: locationQuery || "Custom Location",
      lat: coords?.lat ?? 28.6139,
      lng: coords?.lng ?? 77.209,
    };

    const savedLocationEntry = {
      name: locationData.name,
      lat: locationData.lat,
      lng: locationData.lng,
      lastAqi: airQualityData?.usAqi ?? 100,
      savedAt: new Date(),
    };

    let dbUser = await User.findOne({ email: session.user.email });

    if (!dbUser) {
      dbUser = await User.create({
        name: session.user.name || "VayuMitra User",
        email: session.user.email,
        image: session.user.image || "",
        onboardingCompleted: true,
        defaultLocation: locationData,
        savedLocations: [savedLocationEntry],
        householdProfile: householdProfile || {
          vulnerabilities: ["children", "seniors"],
          commute: "two_wheeler",
          indoorSetup: "purifier",
          windows: { morning: true, commute: true, evening: true },
        },
      });
    } else {
      dbUser.onboardingCompleted = true;
      dbUser.defaultLocation = locationData;
      if (!dbUser.savedLocations) {
        dbUser.savedLocations = [savedLocationEntry];
      } else {
        dbUser.savedLocations.push(savedLocationEntry);
      }
      if (householdProfile) {
        dbUser.householdProfile = householdProfile;
      }
      if (aiPlan) {
        dbUser.aiPlan = aiPlan;
      }
      if (session.user.image && !dbUser.image) {
        dbUser.image = session.user.image;
      }
      await dbUser.save();
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding profile saved successfully",
      user: {
        id: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        onboardingCompleted: dbUser.onboardingCompleted,
        defaultLocation: dbUser.defaultLocation,
      },
    });
  } catch (error: any) {
    console.error("Error saving onboarding data in /api/user/onboarding:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save profile" },
      { status: 500 }
    );
  }
}
