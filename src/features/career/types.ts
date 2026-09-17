export type JobPost = {
  id: string;
  storeId: string;
  title: string;
  department: string;
  position: string;
  location: string;
  state: string;
  description: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CareerApplication = {
  id: string;
  storeId: string;
  jobPostId: string | null;
  name: string;
  email: string;
  phone: string;
  state: string;
  city: string;
  department: string;
  position: string;
  linkedinUrl: string | null;
  message: string;
  status: "NEW" | "REVIEWED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
};
