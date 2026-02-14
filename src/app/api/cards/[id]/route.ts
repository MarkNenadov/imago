import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getCardById, updateCard, deleteCard } from "@/db/cards";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const db = getDb();
  const card = getCardById(db, id);

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json(card);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const db = getDb();
  const body = await request.json();
  const card = updateCard(db, id, body);

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json(card);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const db = getDb();
  const deleted = deleteCard(db, id);

  if (!deleted) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
