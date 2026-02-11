import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  addDoc
} from '@angular/fire/firestore';

export interface Profile {
  id?: string;
  jobTitle: string;
  department: string;
  managerName: string;
  organization: string;
  userId?: string; // Optional reference to user
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface CreateProfileData {
  jobTitle: string;
  department: string;
  managerName: string;
  organization: string;
  userId?: string;
  isActive?: boolean;
}

export interface UpdateProfileData extends CreateProfileData {
  id: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly collectionName = 'profiles';

  constructor(private firestore: Firestore) {}

  /**
   * Get all profiles
   */
  getProfiles(): Observable<Profile[]> {
    const profilesRef = collection(this.firestore, this.collectionName);
    const profilesQuery = query(profilesRef, orderBy('createdAt', 'desc'));
    return collectionData(profilesQuery, { idField: 'id' }) as Observable<Profile[]>;
  }

  /**
   * Get profiles by department
   */
  getProfilesByDepartment(department: string): Observable<Profile[]> {
    const profilesRef = collection(this.firestore, this.collectionName);
    const profilesQuery = query(
      profilesRef,
      where('department', '==', department),
      orderBy('createdAt', 'desc')
    );
    return collectionData(profilesQuery, { idField: 'id' }) as Observable<Profile[]>;
  }

  /**
   * Get profiles by organization
   */
  getProfilesByOrganization(organization: string): Observable<Profile[]> {
    const profilesRef = collection(this.firestore, this.collectionName);
    const profilesQuery = query(
      profilesRef,
      where('organization', '==', organization),
      orderBy('createdAt', 'desc')
    );
    return collectionData(profilesQuery, { idField: 'id' }) as Observable<Profile[]>;
  }

  /**
   * Get profile by user ID
   */
  getProfileByUserId(userId: string): Observable<Profile[]> {
    const profilesRef = collection(this.firestore, this.collectionName);
    const profilesQuery = query(profilesRef, where('userId', '==', userId));
    return collectionData(profilesQuery, { idField: 'id' }) as Observable<Profile[]>;
  }

  /**
   * Create a new profile
   */
  async createProfile(profileData: CreateProfileData): Promise<void> {
    const profilesRef = collection(this.firestore, this.collectionName);

    const newProfile: Omit<Profile, 'id'> = {
      jobTitle: profileData.jobTitle.trim(),
      department: profileData.department,
      managerName: profileData.managerName.trim(),
      organization: profileData.organization.trim(),
      userId: profileData.userId || undefined,
      isActive: profileData.isActive ?? true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await addDoc(profilesRef, newProfile);
  }

  /**
   * Update an existing profile
   */
  async updateProfile(profileData: UpdateProfileData): Promise<void> {
    if (!profileData.id) {
      throw new Error('ProfileDto ID is required for update');
    }

    const profileDocRef = doc(this.firestore, this.collectionName, profileData.id);

    const updateData: Partial<Profile> = {
      jobTitle: profileData.jobTitle.trim(),
      department: profileData.department,
      managerName: profileData.managerName.trim(),
      organization: profileData.organization.trim(),
      userId: profileData.userId || undefined,
      isActive: profileData.isActive ?? true,
      updatedAt: Timestamp.now()
    };

    await updateDoc(profileDocRef, updateData);
  }

  /**
   * Delete a profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    if (!profileId) {
      throw new Error('ProfileDto ID is required for deletion');
    }

    const profileDocRef = doc(this.firestore, this.collectionName, profileId);
    await deleteDoc(profileDocRef);
  }

  /**
   * Toggle profile status (active/inactive)
   */
  async toggleProfileStatus(profileId: string, isActive: boolean): Promise<void> {
    if (!profileId) {
      throw new Error('ProfileDto ID is required');
    }

    const profileDocRef = doc(this.firestore, this.collectionName, profileId);
    await updateDoc(profileDocRef, {
      isActive,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Check if a profile exists for a specific job title and organization
   */
  async checkProfileExists(jobTitle: string, organization: string): Promise<boolean> {
    try {
      const profilesRef = collection(this.firestore, this.collectionName);
      const q = query(
        profilesRef,
        where('jobTitle', '==', jobTitle.trim()),
        where('organization', '==', organization.trim())
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking profile existence:', error);
      return false;
    }
  }

  /**
   * Get unique departments
   */
  async getUniqueDepartments(): Promise<string[]> {
    try {
      const profilesRef = collection(this.firestore, this.collectionName);
      const querySnapshot = await getDocs(profilesRef);

      const departments = new Set<string>();
      querySnapshot.docs.forEach(doc => {
        const profile = doc.data() as Profile;
        if (profile.department) {
          departments.add(profile.department);
        }
      });

      return Array.from(departments).sort();
    } catch (error) {
      console.error('Error getting unique departments:', error);
      return [];
    }
  }

  /**
   * Get unique organizations
   */
  async getUniqueOrganizations(): Promise<string[]> {
    try {
      const profilesRef = collection(this.firestore, this.collectionName);
      const querySnapshot = await getDocs(profilesRef);

      const organizations = new Set<string>();
      querySnapshot.docs.forEach(doc => {
        const profile = doc.data() as Profile;
        if (profile.organization) {
          organizations.add(profile.organization);
        }
      });

      return Array.from(organizations).sort();
    } catch (error) {
      console.error('Error getting unique organizations:', error);
      return [];
    }
  }

  /**
   * Search profiles by multiple criteria
   */
  searchProfiles(searchTerm: string, profiles: Profile[]): Profile[] {
    if (!searchTerm || !searchTerm.trim()) {
      return profiles;
    }

    const term = searchTerm.toLowerCase().trim();
    return profiles.filter(profile =>
      profile.jobTitle.toLowerCase().includes(term) ||
      profile.department.toLowerCase().includes(term) ||
      profile.managerName.toLowerCase().includes(term) ||
      profile.organization.toLowerCase().includes(term)
    );
  }

  /**
   * Filter profiles by criteria
   */
  filterProfiles(
    profiles: Profile[],
    filters: {
      department?: string;
      organization?: string;
      isActive?: boolean;
    }
  ): Profile[] {
    let filteredProfiles = [...profiles];

    if (filters.department) {
      filteredProfiles = filteredProfiles.filter(
        profile => profile.department === filters.department
      );
    }

    if (filters.organization) {
      filteredProfiles = filteredProfiles.filter(
        profile => profile.organization.toLowerCase().includes(filters.organization!.toLowerCase())
      );
    }

    if (filters.isActive !== undefined) {
      filteredProfiles = filteredProfiles.filter(
        profile => profile.isActive === filters.isActive
      );
    }

    return filteredProfiles;
  }

  /**
   * Get profile statistics
   */
  async getProfileStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    departmentCount: { [key: string]: number };
    organizationCount: { [key: string]: number };
  }> {
    try {
      const profilesRef = collection(this.firestore, this.collectionName);
      const querySnapshot = await getDocs(profilesRef);

      const stats = {
        total: 0,
        active: 0,
        inactive: 0,
        departmentCount: {} as { [key: string]: number },
        organizationCount: {} as { [key: string]: number }
      };

      querySnapshot.docs.forEach(doc => {
        const profile = doc.data() as Profile;
        stats.total++;

        if (profile.isActive) {
          stats.active++;
        } else {
          stats.inactive++;
        }

        // Count by department
        if (profile.department) {
          stats.departmentCount[profile.department] =
            (stats.departmentCount[profile.department] || 0) + 1;
        }

        // Count by organization
        if (profile.organization) {
          stats.organizationCount[profile.organization] =
            (stats.organizationCount[profile.organization] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting profile statistics:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        departmentCount: {},
        organizationCount: {}
      };
    }
  }
}
