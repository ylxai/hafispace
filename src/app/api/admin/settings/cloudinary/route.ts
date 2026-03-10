import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { v2 as cloudinary } from "cloudinary";
import { unauthorizedResponse, notFoundResponse, validationErrorResponse, internalErrorResponse, parseRequestBody } from "@/lib/api/response";

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: session.user.id },
      select: {
        cloudinaryCloudName: true,
        cloudinaryApiKey: true,
        cloudinaryApiSecret: true,
      },
    });

    if (!vendor) {
      return notFoundResponse("Vendor not found");
    }

    // Return only public information (not the API secret)
    const hasCloudinaryConfig = !!(vendor.cloudinaryCloudName && vendor.cloudinaryApiKey);

    return NextResponse.json({
      hasConfig: hasCloudinaryConfig,
      cloudName: vendor.cloudinaryCloudName,
      apiKey: vendor.cloudinaryApiKey ? `${vendor.cloudinaryApiKey.substring(0, 4)}...` : null, // Mask the API key
    });
  } catch (error) {
    console.error("Error fetching Cloudinary config:", error);
    return internalErrorResponse("Failed to fetch Cloudinary configuration");
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const bodyResult = await parseRequestBody(request);
    if (!bodyResult.ok) return bodyResult.response;
    const { cloudName, apiKey, apiSecret } = bodyResult.data as Partial<CloudinaryConfig>;

    if (!cloudName || !apiKey || !apiSecret) {
      return validationErrorResponse("Missing required fields: cloudName, apiKey, apiSecret");
    }

    // Test the Cloudinary connection with the NEW credentials (not from database)
    let cloudinaryConnected = false;
    try {
      // Temporarily configure Cloudinary with the new credentials
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      
      const result = await cloudinary.api.ping();
      cloudinaryConnected = result.status === 'ok';
    } catch (cloudinaryError) {
      console.error("Cloudinary connection test failed:", cloudinaryError);
      cloudinaryConnected = false;
    }
    
    if (!cloudinaryConnected) {
      return validationErrorResponse("Failed to connect to Cloudinary with provided credentials");
    }

    // Update vendor with Cloudinary credentials
    await prisma.vendor.update({
      where: { id: session.user.id },
      data: {
        cloudinaryCloudName: cloudName,
        cloudinaryApiKey: apiKey,
        cloudinaryApiSecret: apiSecret,
      },
    });

    return NextResponse.json({ 
      message: "Cloudinary configuration saved successfully",
      hasConfig: true,
    });
  } catch (error) {
    console.error("Error saving Cloudinary config:", error);
    return internalErrorResponse("Failed to save Cloudinary configuration");
  }
}

export async function DELETE() {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  try {
    // Remove Cloudinary credentials from vendor
    await prisma.vendor.update({
      where: { id: session.user.id },
      data: {
        cloudinaryCloudName: null,
        cloudinaryApiKey: null,
        cloudinaryApiSecret: null,
      },
    });

    return NextResponse.json({ 
      message: "Cloudinary configuration removed successfully",
      hasConfig: false,
    });
  } catch (error) {
    console.error("Error removing Cloudinary config:", error);
    return internalErrorResponse("Failed to remove Cloudinary configuration");
  }
}