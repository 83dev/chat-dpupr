import prisma from '../config/database.js';
import type { SSOUserProfile, JWTPayload } from '../types/index.js';

export interface UpsertResult {
  user: {
    nip: string;
    ssoId: number;
    nama: string;
    email: string;
    bidangId: number | null;
    jabatanId: number | null;
  };
  bidangKode?: string;
}

/**
 * Upsert Bidang from SSO profile
 */
export async function upsertBidang(bidang: SSOUserProfile['bidang']): Promise<number | undefined> {
  if (!bidang) return undefined;
  
  const result = await prisma.bidang.upsert({
    where: { kode: bidang.kode },
    create: {
      kode: bidang.kode,
      nama: bidang.nama,
    },
    update: {
      nama: bidang.nama,
    },
  });
  
  return result.id;
}

/**
 * Upsert Jabatan from SSO profile
 */
export async function upsertJabatan(jabatan: SSOUserProfile['jabatan']): Promise<number | undefined> {
  if (!jabatan) return undefined;
  
  const result = await prisma.jabatan.upsert({
    where: { id: jabatan.id },
    create: {
      id: jabatan.id,
      nama: jabatan.nama,
    },
    update: {
      nama: jabatan.nama,
    },
  });
  
  return result.id;
}

/**
 * Handle SSO ID conflict - delete old user if NIP changed
 */
export async function handleSsoIdConflict(ssoUser: SSOUserProfile): Promise<void> {
  const existingUserBySsoId = await prisma.user.findFirst({
    where: { ssoId: ssoUser.id },
  });
  
  if (existingUserBySsoId && existingUserBySsoId.nip !== ssoUser.nip) {
    await prisma.user.delete({
      where: { nip: existingUserBySsoId.nip },
    });
    console.log(`Deleted old user with wrong NIP: ${existingUserBySsoId.nip}`);
  }
}

/**
 * Upsert user from SSO profile - consolidated logic for /callback and /token
 */
export async function upsertUserFromSSO(ssoUser: SSOUserProfile): Promise<UpsertResult> {
  // Upsert Bidang
  const bidangId = await upsertBidang(ssoUser.bidang);
  
  // Upsert Jabatan
  const jabatanId = await upsertJabatan(ssoUser.jabatan);
  
  // Handle SSO ID conflict
  await handleSsoIdConflict(ssoUser);
  
  // Upsert user
  const user = await prisma.user.upsert({
    where: { nip: ssoUser.nip },
    create: {
      nip: ssoUser.nip,
      ssoId: ssoUser.id,
      nama: ssoUser.nama,
      email: ssoUser.email,
      noHp: ssoUser.no_hp,
      bidangId,
      jabatanId,
      lastSeen: new Date(),
    },
    update: {
      ssoId: ssoUser.id, // Fixed: now updates ssoId
      nama: ssoUser.nama,
      email: ssoUser.email,
      noHp: ssoUser.no_hp,
      bidangId,
      jabatanId,
      lastSeen: new Date(),
    },
  });
  
  return {
    user,
    bidangKode: ssoUser.bidang?.kode,
  };
}

/**
 * Auto-join user to their department chat room
 */
export async function autoJoinBidangRoom(userNip: string, bidangId: number | null): Promise<void> {
  if (!bidangId) return;
  
  const bidangRoom = await prisma.chatRoom.findFirst({
    where: {
      type: 'BIDANG',
      bidangId: bidangId,
    },
  });
  
  if (bidangRoom) {
    await prisma.chatRoomMember.upsert({
      where: {
        roomId_userNip: {
          roomId: bidangRoom.id,
          userNip: userNip,
        },
      },
      create: {
        roomId: bidangRoom.id,
        userNip: userNip,
        role: 'member',
      },
      update: {
        leftAt: null, // Rejoin if previously left
      },
    });
  }
}

/**
 * Build JWT payload from user data
 */
export function buildJWTPayload(
  user: UpsertResult['user'],
  bidangKode?: string
): Omit<JWTPayload, 'iat' | 'exp'> {
  return {
    nip: user.nip,
    ssoId: user.ssoId,
    nama: user.nama,
    email: user.email,
    bidangId: user.bidangId ?? undefined,
    bidangKode,
    jabatanId: user.jabatanId ?? undefined,
  };
}
