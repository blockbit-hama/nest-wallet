{{/*
Expand the name of the chart.
*/}}
{{- define "nest-wallet.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "nest-wallet.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "nest-wallet.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "nest-wallet.labels" -}}
helm.sh/chart: {{ include "nest-wallet.chart" . }}
{{ include "nest-wallet.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "nest-wallet.selectorLabels" -}}
app.kubernetes.io/name: {{ include "nest-wallet.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "nest-wallet.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "nest-wallet.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create image name
*/}}
{{- define "nest-wallet.image" -}}
{{- printf "%s:%s" .Values.image.repository .Values.image.tag }}
{{- end }}

{{/*
Create migration image name
*/}}
{{- define "nest-wallet.migrationImage" -}}
{{- $registry := .Values.migration.image.registry | default .Values.global.imageRegistry -}}
{{- $repository := .Values.migration.image.repository -}}
{{- $tag := .Values.migration.image.tag | default .Chart.AppVersion -}}
{{- if $registry }}
{{- printf "%s/%s:%s" $registry $repository $tag }}
{{- else }}
{{- printf "%s:%s" $repository $tag }}
{{- end }}
{{- end }}

{{/*
Blue/Green service names
*/}}
{{- define "nest-wallet.activeServiceName" -}}
{{- printf "%s-active" (include "nest-wallet.fullname" .) }}
{{- end }}

{{- define "nest-wallet.previewServiceName" -}}
{{- printf "%s-preview" (include "nest-wallet.fullname" .) }}
{{- end }}

{{/*
Create environment variables
*/}}
{{- define "nest-wallet.env" -}}
{{- range .Values.env }}
- name: {{ .name }}
  value: {{ .value | quote }}
{{- end }}
{{- end }}

{{/*
Create pod annotations
*/}}
{{- define "nest-wallet.podAnnotations" -}}
{{- if .Values.podAnnotations }}
{{- toYaml .Values.podAnnotations }}
{{- end }}
{{- end }}

{{/*
Create pod labels
*/}}
{{- define "nest-wallet.podLabels" -}}
{{- if .Values.podLabels }}
{{- toYaml .Values.podLabels }}
{{- end }}
{{- end }}

{{/*
Create environment variables from Secrets Manager (민감한 설정)
*/}}
{{- define "nest-wallet.secretsEnv" -}}
{{- if eq .Values.global.environment "dev" }}
# API 설정 (민감)
- name: NEXT_PUBLIC_API_URL
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: NEXT_PUBLIC_API_URL
- name: NEXT_PUBLIC_API_BASE_URL
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: NEXT_PUBLIC_API_BASE_URL

# 블록체인 API 키들 (민감)
- name: NEXT_PUBLIC_INFURA_API_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: NEXT_PUBLIC_INFURA_API_KEY
- name: NEXT_PUBLIC_BLOCKCYPHER_TOKEN
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: NEXT_PUBLIC_BLOCKCYPHER_TOKEN
- name: NEXT_PUBLIC_ETHERSCAN_API_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: NEXT_PUBLIC_ETHERSCAN_API_KEY

# 외부 API 설정 (민감)
- name: NEXT_PUBLIC_COINGECKO_API_BASE
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: NEXT_PUBLIC_COINGECKO_API_BASE

# 데이터베이스 설정 (민감)
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: DATABASE_URL

# 인증 설정 (민감)
- name: JWT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: JWT_SECRET

# 기타 민감한 설정
- name: API_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: API_KEY
- name: REDIS_URL
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: REDIS_URL
{{- else if eq .Values.global.environment "prod" }}
# API 설정 (민감)
- name: NEXT_PUBLIC_API_URL
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: NEXT_PUBLIC_API_URL
- name: NEXT_PUBLIC_API_BASE_URL
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: NEXT_PUBLIC_API_BASE_URL

# 블록체인 API 키들 (민감)
- name: NEXT_PUBLIC_INFURA_API_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: NEXT_PUBLIC_INFURA_API_KEY
- name: NEXT_PUBLIC_BLOCKCYPHER_TOKEN
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: NEXT_PUBLIC_BLOCKCYPHER_TOKEN
- name: NEXT_PUBLIC_ETHERSCAN_API_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: NEXT_PUBLIC_ETHERSCAN_API_KEY

# 외부 API 설정 (민감)
- name: NEXT_PUBLIC_COINGECKO_API_BASE
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: NEXT_PUBLIC_COINGECKO_API_BASE

# 데이터베이스 설정 (민감)
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: DATABASE_URL

# 인증 설정 (민감)
- name: JWT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: JWT_SECRET

# 기타 민감한 설정
- name: API_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: API_KEY
- name: REDIS_URL
  valueFrom:
    secretKeyRef:
      name: {{ include "nest-wallet.fullname" . }}-secrets
      key: REDIS_URL
{{- end }}
{{- end }}
