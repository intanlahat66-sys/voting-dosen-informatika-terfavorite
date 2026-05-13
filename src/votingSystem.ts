/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class Pemilih {
  id: string;
  nama: string;
  sudahMemilih: boolean;

  constructor(id: string, nama: string) {
    this.id = id;
    this.nama = nama;
    this.sudahMemilih = false;
  }
}

export class Kandidat {
  id: string;
  nama: string;
  suara: number;
  foto?: string;

  constructor(id: string, nama: string, foto?: string) {
    this.id = id;
    this.nama = nama;
    this.suara = 0;
    this.foto = foto;
  }
}

export const fungsiVoting = (pemilih: Pemilih, kandidat: Kandidat): boolean => {
  if (pemilih.sudahMemilih) {
    return false;
  }
  kandidat.suara += 1;
  pemilih.sudahMemilih = true;
  return true;
};

export const fungsiHitungHasil = (kandidatList: Kandidat[]): { [id: string]: number } => {
  const hasil: { [id: string]: number } = {};
  kandidatList.forEach((k) => {
    hasil[k.id] = k.suara;
  });
  return hasil;
};

// Simple Test Runner
export const runTests = () => {
  const results = {
    unitTestVoting: "FAIL",
    unitTestHitungSuara: "FAIL",
    integrationTest: "FAIL",
  };

  // Test Unit: Voting
  const p1 = new Pemilih("1", "Voter 1");
  const k1 = new Kandidat("k1", "Candidate 1");
  const success1 = fungsiVoting(p1, k1);
  const success2 = fungsiVoting(p1, k1); // Should fail

  if (success1 === true && success2 === false && k1.suara === 1) {
    results.unitTestVoting = "PASS";
  }

  // Test Unit: Hitung Suara
  const k2 = new Kandidat("k2", "Candidate 2");
  k2.suara = 5;
  const k3 = new Kandidat("k3", "Candidate 3");
  k3.suara = 2;
  const hasil = fungsiHitungHasil([k2, k3]);
  if (hasil["k2"] === 5 && hasil["k3"] === 2) {
    results.unitTestHitungSuara = "PASS";
  }

  // Integration Test
  const iP1 = new Pemilih("ip1", "Voter A");
  const iP2 = new Pemilih("ip2", "Voter B");
  const iK = new Kandidat("ik1", "Candidate X");
  
  const v1 = fungsiVoting(iP1, iK);
  const v2 = fungsiVoting(iP2, iK);
  const v3 = fungsiVoting(iP1, iK); // Duplicate
  
  const finalResult = fungsiHitungHasil([iK]);
  
  if (v1 && v2 && !v3 && finalResult["ik1"] === 2) {
    results.integrationTest = "PASS";
  }

  return results;
};
