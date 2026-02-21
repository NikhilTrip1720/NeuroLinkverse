export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  isEmailVerified: boolean;
  level: number;
  xp: number;
  streak: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  level: number;
  xp: number;
  streak: number;
}

export interface Circle {
  id: string;
  name: string;
  description: string;
  subject: string;
  isPrivate: boolean;
  maxMembers: number;
  creatorId: string;
  creator?: UserPublic;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CircleMember {
  userId: string;
  circleId: string;
  role: CircleRole;
  joinedAt: Date;
  user?: UserPublic;
}

export type CircleRole = 'ADMIN' | 'MODERATOR' | 'MEMBER';

export interface Message {
  id: string;
  content: string;
  circleId: string;
  authorId: string;
  author?: UserPublic;
  type: MessageType;
  fileUrl?: string | null;
  fileName?: string | null;
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
}

export type MessageType = 'TEXT' | 'FILE' | 'SYSTEM';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  circleId: string;
  creatorId: string;
  assigneeId?: string | null;
  assignee?: UserPublic | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Resource {
  id: string;
  title: string;
  description?: string | null;
  url?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  type: ResourceType;
  circleId: string;
  uploaderId: string;
  uploader?: UserPublic;
  createdAt: Date;
}

export type ResourceType = 'LINK' | 'FILE' | 'NOTE';

export interface StudyPlan {
  id: string;
  title: string;
  subject: string;
  duration: string;
  level: string;
  content: StudyPlanContent;
  userId: string;
  circleId?: string | null;
  createdAt: Date;
}

export interface StudyPlanContent {
  overview: string;
  weeks: StudyPlanWeek[];
  resources: string[];
  milestones: string[];
}

export interface StudyPlanWeek {
  week: number;
  title: string;
  topics: string[];
  activities: string[];
  goals: string[];
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  link?: string | null;
  createdAt: Date;
}

export type NotificationType =
  | 'CIRCLE_INVITE'
  | 'NEW_MESSAGE'
  | 'TASK_ASSIGNED'
  | 'TASK_COMPLETED'
  | 'MEETING_STARTING'
  | 'LEVEL_UP'
  | 'ACHIEVEMENT'
  | 'SYSTEM';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  achievement?: Achievement;
  earnedAt: Date;
}

export interface LeaderboardEntry {
  rank: number;
  user: UserPublic;
  xp: number;
  level: number;
  streak: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SocketEvents {
  'message:new': (message: Message) => void;
  'message:edit': (message: Message) => void;
  'message:delete': (messageId: string) => void;
  'typing:start': (data: { userId: string; username: string; circleId: string }) => void;
  'typing:stop': (data: { userId: string; circleId: string }) => void;
  'circle:join': (data: { userId: string; circleId: string }) => void;
  'circle:leave': (data: { userId: string; circleId: string }) => void;
  'member:joined': (member: CircleMember) => void;
  'member:left': (data: { userId: string; circleId: string }) => void;
  'notification:new': (notification: Notification) => void;
  'task:updated': (task: Task) => void;
  'meeting:starting': (data: { circleId: string; meetingUrl: string }) => void;
  error: (error: { message: string }) => void;
}
