import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/options";
import { prisma } from "@/lib/db";
import { unauthorizedResponse, notFoundResponse, validationErrorResponse , parseRequestBody } from "@/lib/api/response";
import { z } from "zod";

const customFieldSchema = z.object({
  label: z.string().min(1, "Label wajib diisi"),
  tipe: z.enum(["TEXT", "TEXTAREA", "DATE", "NUMBER", "SELECT"]).default("TEXT"),
  isRequired: z.boolean().default(false),
  options: z.array(z.string()).optional().nullable(),
});

// GET — list semua custom fields milik vendor
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const fields = await prisma.customField.findMany({
    where: { vendorId: session.user.id },
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
}

// POST — buat custom field baru
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const bodyResult = await parseRequestBody(request);
  if (!bodyResult.ok) return bodyResult.response;
  const parsed = customFieldSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.format());
  }

  const { label, tipe, isRequired, options } = parsed.data;

  // Hitung urutan berikutnya
  const lastField = await prisma.customField.findFirst({
    where: { vendorId: session.user.id },
    orderBy: { urutan: "desc" },
    select: { urutan: true },
  });
  const urutan = (lastField?.urutan ?? -1) + 1;

  const field = await prisma.customField.create({
    data: {
      vendorId: session.user.id,
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
}

// PATCH — update urutan / isActive
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const bodyResult = await parseRequestBody(request);
  if (!bodyResult.ok) return bodyResult.response;
  const patchSchema = z.object({
    id: z.string().min(1, "Field ID required"),
    urutan: z.number().optional(),
    isActive: z.boolean().optional(),
    label: z.string().optional(),
  });
  const patchParsed = patchSchema.safeParse(bodyResult.data);
  if (!patchParsed.success) return validationErrorResponse(patchParsed.error.format());
  const body = patchParsed.data;
  const { id } = body;

  const existing = await prisma.customField.findFirst({
    where: { id, vendorId: session.user.id },
  });
  if (!existing) return notFoundResponse("Field not found");

  const updated = await prisma.customField.update({
    where: { id },
    data: {
      ...(body.urutan !== undefined && { urutan: body.urutan }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.label !== undefined && { label: body.label, namaField: body.label }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE — hapus custom field
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return validationErrorResponse("Field ID required");

  const existing = await prisma.customField.findFirst({
    where: { id, vendorId: session.user.id },
  });
  if (!existing) return notFoundResponse("Field not found");

  await prisma.customField.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
