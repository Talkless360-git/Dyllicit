import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/db/prisma";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // 1. Auth Check: Only Admins can delete users
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userIdToDelete = params.id;

    // 2. Self-Deletion Check: Prevent admins from deleting themselves
    if (userIdToDelete === session.user.id) {
      return NextResponse.json({ error: "Self-deletion is prohibited for safety." }, { status: 400 });
    }

    // 3. NFT Listing Check: Block deletion if user has active NFTs
    const activeNFTs = await prisma.nFT.findMany({
      where: { userId: userIdToDelete }
    });

    if (activeNFTs.length > 0) {
      return NextResponse.json({ 
        error: "Cannot delete user with active NFT listings. Remove NFTs first." 
      }, { status: 400 });
    }

    // 4. Perform Hard Delete
    await prisma.user.delete({
      where: { id: userIdToDelete }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin User Delete Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
