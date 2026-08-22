/** Fields captured for the Letter of Authorisation (Astute standard form CC001E). */
export type LoaData = {
  idNumber: string;
  telephone: string;
  // "or any/the following member of his/her staff" on the paper form —
  // optional named second person who may also request info on the client's
  // behalf. Left blank for the common case of just authorising Phumelele.
  staffMember: string;
};

/** Fields captured for the ThuthukaSA Risk Profile Analysis (FSP 47992). */
export type RpaData = {
  gender: string;
  cellPhone: string;
  email: string;
  workNumber: string;
  qualification: string;
  occupation: string;
  grossMonthlyIncome: string;
  maritalStatus: string;
  stokvelName: string;
  objective: string;
  term: string;
  monthlyAmount: string;
  riskAppetite: string;
  scaredOfLosingMoney: string;
  withdrawSoon: string;
  existingInvestments: string;
  investingKnowledge: string;
  emergencyFund: string;
  children: string;
  savedForEducation: string;
  savedForRetirement: string;
  newsletterSubscribe: string;
};

// Defaults to Amantle — ThuthukaSA's day-to-day contact for these forms —
// same idea as rpa.stokvelName defaulting to "A-Win" below. Still editable
// per submission if a different staff member is actually the right one.
export const emptyLoaData = (): LoaData => ({ idNumber: "", telephone: "", staffMember: "Amantle" });

export const emptyRpaData = (): RpaData => ({
  gender: "",
  cellPhone: "",
  email: "",
  workNumber: "",
  qualification: "",
  occupation: "",
  grossMonthlyIncome: "",
  maritalStatus: "",
  stokvelName: "A-Win",
  objective: "",
  term: "",
  monthlyAmount: "",
  riskAppetite: "",
  scaredOfLosingMoney: "",
  withdrawSoon: "",
  existingInvestments: "",
  investingKnowledge: "",
  emergencyFund: "",
  children: "",
  savedForEducation: "",
  savedForRetirement: "",
  newsletterSubscribe: "",
});
