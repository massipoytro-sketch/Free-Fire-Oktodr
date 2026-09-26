import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const connectionAuthType = v.union(
  v.literal("api_key"),
  v.literal("oauth"),
  v.literal("token"),
  v.literal("basic"),
  v.literal("service_account"),
);

const secretKind = v.union(
  v.literal("api_key"),
  v.literal("access_token"),
  v.literal("refresh_token"),
  v.literal("oauth_client_secret"),
  v.literal("deploy_token"),
  v.literal("private_key"),
  v.literal("generic"),
);

const projectStatus = v.union(
  v.literal("active"),
  v.literal("archived"),
);

const versionStatus = v.union(
  v.literal("draft"),
  v.literal("ready"),
  v.literal("current"),
  v.literal("archived"),
);

const storageKind = v.union(
  v.literal("project_file"),
  v.literal("snapshot"),
  v.literal("archive"),
  v.literal("build_artifact"),
  v.literal("export"),
  v.literal("log"),
  v.literal("ai_output"),
);

const buildStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("success"),
  v.literal("failed"),
  v.literal("cancelled"),
);

const deploymentStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("success"),
  v.literal("failed"),
  v.literal("cancelled"),
);

const agentTaskStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("blocked"),
  v.literal("success"),
  v.literal("failed"),
  v.literal("cancelled"),
);

const agentTaskType = v.union(
  v.literal("plan"),
  v.literal("code"),
  v.literal("test"),
  v.literal("build"),
  v.literal("deploy"),
  v.literal("repair"),
  v.literal("sync"),
  v.literal("maintenance"),
);

export default defineSchema({
  projects: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    status: projectStatus,
    repository: v.optional(v.string()),
    defaultBranch: v.optional(v.string()),
    currentVersionId: v.optional(v.id("versions")),
    nextVersionNumber: v.number(),
    metadata: v.optional(v.string()),
  }).index("by_slug", ["slug"]).index("by_status", ["status"]),

  connections: defineTable({
    provider: v.string(),
    displayName: v.string(),
    authType: connectionAuthType,
    projectId: v.optional(v.id("projects")),
    secretId: v.optional(v.id("secrets")),
    externalAccountId: v.optional(v.string()),
    metadata: v.optional(v.string()),
    enabled: v.boolean(),
    lastValidatedAt: v.optional(v.number()),
  })
    .index("by_provider", ["provider"])
    .index("by_project", ["projectId"])
    .index("by_project_and_provider", ["projectId", "provider"]),

  secrets: defineTable({
    name: v.string(),
    provider: v.string(),
    kind: secretKind,
    projectId: v.optional(v.id("projects")),
    currentVersionId: v.optional(v.id("secretVersions")),
    enabled: v.boolean(),
    metadata: v.optional(v.string()),
  })
    .index("by_provider", ["provider"])
    .index("by_project", ["projectId"])
    .index("by_project_and_name", ["projectId", "name"]),

  secretVersions: defineTable({
    secretId: v.id("secrets"),
    version: v.number(),
    algorithm: v.literal("AES-256-GCM"),
    ciphertext: v.string(),
    iv: v.string(),
    authTag: v.string(),
    createdAt: v.number(),
    note: v.optional(v.string()),
  })
    .index("by_secret", ["secretId"])
    .index("by_secret_and_version", ["secretId", "version"]),

  versions: defineTable({
    projectId: v.id("projects"),
    number: v.number(),
    label: v.optional(v.string()),
    status: versionStatus,
    commitSha: v.optional(v.string()),
    manifestJson: v.optional(v.string()),
    snapshotStorageId: v.optional(v.id("_storage")),
    sizeBytes: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_number", ["projectId", "number"])
    .index("by_project_and_status", ["projectId", "status"]),

  storageObjects: defineTable({
    projectId: v.optional(v.id("projects")),
    versionId: v.optional(v.id("versions")),
    storageId: v.id("_storage"),
    kind: storageKind,
    path: v.optional(v.string()),
    fileName: v.string(),
    contentType: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    sha256: v.optional(v.string()),
    createdAt: v.number(),
    metadata: v.optional(v.string()),
  })
    .index("by_project", ["projectId"])
    .index("by_version", ["versionId"])
    .index("by_project_and_kind", ["projectId", "kind"]),

  builds: defineTable({
    projectId: v.id("projects"),
    versionId: v.optional(v.id("versions")),
    status: buildStatus,
    provider: v.optional(v.string()),
    externalBuildId: v.optional(v.string()),
    command: v.optional(v.string()),
    artifactStorageId: v.optional(v.id("_storage")),
    logsStorageId: v.optional(v.id("_storage")),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    metadata: v.optional(v.string()),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_status", ["projectId", "status"]),

  deployments: defineTable({
    projectId: v.id("projects"),
    versionId: v.optional(v.id("versions")),
    status: deploymentStatus,
    provider: v.string(),
    externalDeploymentId: v.optional(v.string()),
    url: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    metadata: v.optional(v.string()),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_status", ["projectId", "status"]),

  aiThreads: defineTable({
    projectId: v.optional(v.id("projects")),
    model: v.string(),
    title: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_updatedAt", ["projectId", "updatedAt"]),

  aiMessages: defineTable({
    threadId: v.id("aiThreads"),
    role: v.union(
      v.literal("system"),
      v.literal("user"),
      v.literal("assistant"),
      v.literal("tool"),
    ),
    content: v.string(),
    createdAt: v.number(),
    toolName: v.optional(v.string()),
    metadata: v.optional(v.string()),
  })
    .index("by_thread", ["threadId"])
    .index("by_thread_and_createdAt", ["threadId", "createdAt"]),

  agentTasks: defineTable({
    projectId: v.optional(v.id("projects")),
    type: agentTaskType,
    status: agentTaskStatus,
    title: v.string(),
    inputJson: v.optional(v.string()),
    outputJson: v.optional(v.string()),
    error: v.optional(v.string()),
    parentTaskId: v.optional(v.id("agentTasks")),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_status", ["projectId", "status"])
    .index("by_parent", ["parentTaskId"]),

  auditLogs: defineTable({
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.optional(v.string()),
    detailJson: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]).index("by_resource", ["resourceType", "resourceId"]),

  systemSettings: defineTable({
    key: v.string(),
    value: v.string(),
    isSecret: v.boolean(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  aiConnections: defineTable({
    provider: v.literal("openrouter"),
    model: v.string(),
    secretId: v.id("secrets"),
    enabled: v.boolean(),
    keyHint: v.optional(v.string()),
    status: v.union(
      v.literal("not_configured"),
      v.literal("configured"),
      v.literal("error"),
    ),
    lastTestedAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    endpoint: v.string(),
  }).index("by_provider", ["provider"]),
});
