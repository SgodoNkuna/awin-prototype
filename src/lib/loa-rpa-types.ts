/** Fields captured for the Letter of Authorisation (Astute standard form). */
export type LoaData = {
  idNumber: string;
  telephone: string;
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

export const emptyLoaData = (): LoaData => ({ idNumber: "", telephone: "" });

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
