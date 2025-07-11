{{/*
Expand the name of the chart.
*/}}
{{- define "cloud-resource-docs.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "cloud-resource-docs.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "cloud-resource-docs.labels" -}}
helm.sh/chart: {{ include "cloud-resource-docs.chart" . }}
{{ include "cloud-resource-docs.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "cloud-resource-docs.selectorLabels" -}}
app.kubernetes.io/name: {{ include "cloud-resource-docs.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
