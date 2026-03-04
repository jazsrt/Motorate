export interface SpotWizardData {
  plateState: string;
  plateNumber: string;
  plateHash?: string;
  vehicleId?: string;
  make: string;
  model: string;
  color: string;
  year?: string;
  trim?: string;
  stockImageUrl?: string;
  driverRating?: number;
  drivingRating?: number;
  vehicleRating?: number;
  sentiment?: 'love' | 'hate';
  comment?: string;
}

export interface ReviewSubmitPayload {
  vehicleId: string;
  spotType: 'quick' | 'full';
  driverRating: number;
  drivingRating: number;
  vehicleRating: number;
  looksRating?: number;
  soundRating?: number;
  conditionRating?: number;
  sentiment: 'love' | 'hate';
  comment?: string;
  selectedTags?: string[];
}
