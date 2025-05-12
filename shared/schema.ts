import { pgTable, text, serial, integer, boolean, timestamp, unique, pgEnum, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const platformEnum = pgEnum('platform', ['app_store', 'google_play']);
export const appStatusEnum = pgEnum('app_status', ['active', 'warning', 'error']);
export const reviewResponseStatusEnum = pgEnum('review_response_status', ['draft', 'approved', 'published']);
export const responseStyleEnum = pgEnum('response_style', ['friendly', 'professional', 'casual', 'formal']);
export const environmentTypeEnum = pgEnum('environment_type', ['production', 'sandbox']);
export const apiTypeEnum = pgEnum('api_type', ['app_store_connect', 'google_play_developer', 'gigachat']);
export const testScenarioTypeEnum = pgEnum('test_scenario_type', ['success', 'error', 'timeout', 'rate_limit']);

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users Table - Updated for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Apps Table
export const apps = pgTable("apps", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  platform: platformEnum("platform").notNull(),
  bundleId: text("bundle_id"),
  apiKey: text("api_key").notNull(),
  apiSecret: text("api_secret"),
  status: appStatusEnum("status").default("active").notNull(),
  autoRespond: boolean("auto_respond").default(true).notNull(),
  reviewCount: integer("review_count").default(0).notNull(),
  lastSynced: timestamp("last_synced").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Reviews Table
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  appId: integer("app_id").references(() => apps.id).notNull(),
  platform: platformEnum("platform").notNull(),
  externalId: text("external_id").notNull(),
  authorName: text("author_name").notNull(),
  authorId: text("author_id"),
  rating: integer("rating").notNull(),
  title: text("title"),
  text: text("text").notNull(),
  language: text("language"),
  version: text("version"),
  responseId: integer("response_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    appExternalIdIdx: unique().on(table.appId, table.externalId),
  };
});

// Review Responses Table
export const reviewResponses = pgTable("review_responses", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").references(() => reviews.id).notNull(),
  text: text("text").notNull(),
  status: reviewResponseStatusEnum("status").default("draft").notNull(),
  isGenerated: boolean("is_generated").default(true).notNull(),
  externalResponseId: text("external_response_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"),
});

// AI Settings Table
export const aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  apiKey: text("api_key"),
  responseStyle: responseStyleEnum("response_style").default("professional").notNull(),
  maxResponseLength: integer("max_response_length").default(250).notNull(),
  includeSignature: boolean("include_signature").default(false).notNull(),
  signature: text("signature"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User Settings Table
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  reviewAlerts: boolean("review_alerts").default(true).notNull(),
  responseAlerts: boolean("response_alerts").default(true).notNull(),
  dailyDigest: boolean("daily_digest").default(true).notNull(),
  marketingEmails: boolean("marketing_emails").default(false).notNull(),
  defaultLanguage: text("default_language").default("en").notNull(),
  autoDetectLanguage: boolean("auto_detect_language").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Analytics Data Table
export const analyticsData = pgTable("analytics_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  appId: integer("app_id").references(() => apps.id),
  date: timestamp("date").defaultNow().notNull(),
  reviewCount: integer("review_count").default(0).notNull(),
  avgRating: integer("avg_rating").default(0).notNull(),
  responseCount: integer("response_count").default(0).notNull(),
  responseRate: integer("response_rate").default(0).notNull(),
  aiAccuracy: integer("ai_accuracy").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertAppSchema = createInsertSchema(apps).omit({
  id: true,
  userId: true,
  reviewCount: true,
  lastSynced: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  responseId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewResponseSchema = createInsertSchema(reviewResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
});

export const insertAISettingsSchema = createInsertSchema(aiSettings).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnalyticsDataSchema = createInsertSchema(analyticsData).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;

export type App = typeof apps.$inferSelect;
export type InsertApp = z.infer<typeof insertAppSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type ReviewResponse = typeof reviewResponses.$inferSelect;
export type InsertReviewResponse = z.infer<typeof insertReviewResponseSchema>;

export type AISettings = typeof aiSettings.$inferSelect;
export type InsertAISettings = z.infer<typeof insertAISettingsSchema>;

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

export type AnalyticsData = typeof analyticsData.$inferSelect;
export type InsertAnalyticsData = z.infer<typeof insertAnalyticsDataSchema>;

// Sandbox Tables
export const sandboxEnvironments = pgTable("sandbox_environments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sandboxApiEndpoints = pgTable("sandbox_api_endpoints", {
  id: serial("id").primaryKey(),
  environmentId: integer("environment_id").references(() => sandboxEnvironments.id).notNull(),
  apiType: apiTypeEnum("api_type").notNull(),
  path: text("path").notNull(),
  method: text("method").notNull().default("GET"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sandboxTestScenarios = pgTable("sandbox_test_scenarios", {
  id: serial("id").primaryKey(),
  endpointId: integer("endpoint_id").references(() => sandboxApiEndpoints.id).notNull(),
  name: text("name").notNull(),
  type: testScenarioTypeEnum("type").notNull(),
  description: text("description"),
  requestConditions: jsonb("request_conditions"),
  responseData: jsonb("response_data").notNull(),
  statusCode: integer("status_code").default(200).notNull(),
  delayMs: integer("delay_ms").default(0),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sandboxLogs = pgTable("sandbox_logs", {
  id: serial("id").primaryKey(),
  environmentId: integer("environment_id").references(() => sandboxEnvironments.id).notNull(),
  endpointId: integer("endpoint_id").references(() => sandboxApiEndpoints.id),
  scenarioId: integer("scenario_id").references(() => sandboxTestScenarios.id),
  requestMethod: text("request_method").notNull(),
  requestPath: text("request_path").notNull(),
  requestHeaders: jsonb("request_headers"),
  requestBody: jsonb("request_body"),
  responseStatus: integer("response_status").notNull(),
  responseBody: jsonb("response_body"),
  duration: integer("duration").default(0).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Sandbox Zod schemas
export const insertSandboxEnvironmentSchema = createInsertSchema(sandboxEnvironments).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSandboxApiEndpointSchema = createInsertSchema(sandboxApiEndpoints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSandboxTestScenarioSchema = createInsertSchema(sandboxTestScenarios).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSandboxLogSchema = createInsertSchema(sandboxLogs).omit({
  id: true,
});

// Sandbox Types
export type SandboxEnvironment = typeof sandboxEnvironments.$inferSelect;
export type InsertSandboxEnvironment = z.infer<typeof insertSandboxEnvironmentSchema>;

export type SandboxApiEndpoint = typeof sandboxApiEndpoints.$inferSelect;
export type InsertSandboxApiEndpoint = z.infer<typeof insertSandboxApiEndpointSchema>;

export type SandboxTestScenario = typeof sandboxTestScenarios.$inferSelect;
export type InsertSandboxTestScenario = z.infer<typeof insertSandboxTestScenarioSchema>;

export type SandboxLog = typeof sandboxLogs.$inferSelect;
export type InsertSandboxLog = z.infer<typeof insertSandboxLogSchema>;
