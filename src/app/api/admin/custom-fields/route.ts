import { type NextRequest,NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/error-handler";
import { notFoundResponse, parseAndValidate,validationErrorResponse  } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

const customFieldSchema = z.object({
  label: z.string().min(1, "Label wajib diisi"),
  tipe: z.enum(["TEXT", "TEXTAREA", "DATE", "NUMBER", "SELECT"]).default("TEXT"),
  isRequired: z.boolean().default(false),
  options: z.array(z.string()).optional().nullable(),
});

// GET — list semua custom fields milik vendor
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
  

  const fields = await prisma.customField.findMany({
    where: { vendorId: user.id },
    orderBy: { urutan: "asc" },
    select: {
      id: true,
      label: true,
      namaField: true,
      tipe: true,
      isRequired: true,
      isActive: true,
      urutan: true,
      options: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ fields });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST — buat custom field baru
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const result = await parseAndValidate(request, customFieldSchema);
    if (!result.ok) return result.response;

    const { label, tipe, isRequired, options } = result.data;

    // Hitung urutan berikutnya
    const lastField = await prisma.customField.findFirst({
      where: { vendorId: user.id },
      orderBy: { urutan: "desc" },
      select: { urutan: true },
    });
    const urutan = (lastField?.urutan ?? -1) + 1;

    const field = await prisma.customField.create({
      data: {
        vendorId: user.id,
        label,
        namaField: label, // sama dengan label
        tipe,
        isRequired,
        wajib: isRequired,
        isActive: true,
        urutan,
        options: options ?? undefined,
      },
    });

    return NextResponse.json(field, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH — update urutan / isActive
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const patchSchema = z.object({
      id: z.string().min(1, "Field ID required"),
      urutan: z.number().optional(),
      isActive: z.boolean().optional(),
      label: z.string().optional(),
    });
    const result = await parseAndValidate(request, patchSchema);
    if (!result.ok) return result.response;
    const body = result.data;
    const { id } = body;

    const existing = await prisma.customField.findFirst({
      where: { id, vendorId: user.id },
    });
    if (!existing) return notFoundResponse("Field not found");

    const updated = await prisma.customField.update({
      where: { id, vendorId: user.id },
      data: {
        ...(body.urutan !== undefined && { urutan: body.urutan }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.label !== undefined && { label: body.label, namaField: body.label }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE — hapus custom field
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return validationErrorResponse("Field ID required");

    const existing = await prisma.customField.findFirst({
      where: { id, vendorId: user.id },
    });
    if (!existing) return notFoundResponse("Field not found");

    await prisma.customField.delete({ where: { id, vendorId: user.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
