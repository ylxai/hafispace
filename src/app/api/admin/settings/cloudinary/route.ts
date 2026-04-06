import { v2 as cloudinary } from "cloudinary";
import { type NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/error-handler";
import { notFoundResponse, parseRequestBody, validationErrorResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import logger from "@/lib/logger";

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const vendor = await prisma.vendor.findUnique({
      where: { id: user.id },
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
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
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
      logger.error({ err: cloudinaryError }, "Cloudinary connection test failed");
      cloudinaryConnected = false;
    }
    
    if (!cloudinaryConnected) {
      return validationErrorResponse("Failed to connect to Cloudinary with provided credentials");
    }

    // Update vendor with Cloudinary credentials
    await prisma.vendor.update({
      where: { id: user.id },
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
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    // Remove Cloudinary credentials from vendor
    await prisma.vendor.update({
      where: { id: user.id },
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
    return handleApiError(error);
  }
}