# Cloud Resource Docs Helm Chart

Questo Helm chart permette di deployare l'applicazione di documentazione Cloud Resource Docs su Kubernetes.

## Prerequisiti

- Kubernetes 1.16+
- Helm 3.0+
- N```
helm/cloud-resource-docs/
├── Chart.yaml                 # Metadati del chart
├── values.yaml               # Valori minimali (solo immagine e risorse)
├── templates/
│   ├── _helpers.tpl          # Template helpers
│   ├── deployment.yaml       # Deployment Kubernetes
│   ├── service.yaml          # Service Kubernetes
│   ├── ingress.yaml          # Ingress Kubernetes
│   └── NOTES.txt            # Note post-installazione
```

## Valori predefiniti

Il chart include configurazioni predefinite per:

- **Repliche**: 2 istanze
- **Risorse**: 250m CPU / 256Mi RAM (requests), 500m CPU / 512Mi RAM (limits)
- **Security**: Container non-root, capabilities limitate
- **Nginx**: Configurazione ottimizzata per SPA con compressione gzip
- **Ingress**: Abilitato con TLS automatico tramite cert-manager
- **Service**: ClusterIP sulla porta 80ontroller
- Cert-Manager (per TLS automatico)

## Installazione

```bash
# Installa il chart
helm install cloud-resource-docs ./helm/cloud-resource-docs \
  --namespace cloud-resource-docs \
  --create-namespace \
  --set ingress.host=docs.example.com \
  --set image.tag=latest

# Upgrade del chart
helm upgrade cloud-resource-docs ./helm/cloud-resource-docs \
  --namespace cloud-resource-docs \
  --set ingress.host=docs.example.com \
  --set image.tag=v1.2.0
```

## Configurazione

### Parametri minimi

Il file `values.yaml` è stato semplificato per contenere solo i parametri essenziali:

| Parametro | Descrizione | Default |
|-----------|-------------|---------|
| `image.repository` | Repository dell'immagine Docker | `cloud-resource-docs` |
| `image.tag` | Tag dell'immagine Docker | `latest` |
| `image.pullPolicy` | Policy per il pull dell'immagine | `IfNotPresent` |
| `resources` | Limiti e richieste di risorse (opzionale) | Valori predefiniti |

### Esempio di personalizzazione minimale

```yaml
# custom-values.yaml
image:
  repository: myregistry/cloud-resource-docs
  tag: "v1.2.0"

# Opzionale: override delle risorse
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi
```

### Configurazioni avanzate (opzionali)

Se necessario, puoi ancora personalizzare:

```yaml
# custom-values.yaml avanzato
image:
  repository: myregistry/cloud-resource-docs
  tag: "v1.2.0"

# Override del numero di repliche
replicaCount: 3

# Configurazione ingress personalizzata
ingress:
  enabled: true
  host: "docs.mycompany.com"
  path: "/"

# Configurazione service personalizzata
service:
  type: ClusterIP
  port: 80
```

Usa il file custom:

```bash
helm install cloud-resource-docs ./helm/cloud-resource-docs \
  --namespace cloud-resource-docs \
  --create-namespace \
  --values custom-values.yaml
```

## Gestione

### Verificare lo stato del deployment

```bash
# Controlla i pod
kubectl get pods -n cloud-resource-docs

# Controlla i servizi
kubectl get services -n cloud-resource-docs

# Controlla l'ingress
kubectl get ingress -n cloud-resource-docs

# Visualizza i log
kubectl logs -f deployment/cloud-resource-docs -n cloud-resource-docs
```

### Scalare il deployment

```bash
kubectl scale deployment cloud-resource-docs --replicas=5 -n cloud-resource-docs
```

### Aggiornare l'applicazione

```bash
helm upgrade cloud-resource-docs ./helm/cloud-resource-docs \
  --namespace cloud-resource-docs \
  --set image.tag=v1.3.0
```

### Disinstallare

```bash
helm uninstall cloud-resource-docs --namespace cloud-resource-docs
```

## Troubleshooting

### Pod non si avvia

```bash
# Controlla lo stato dei pod
kubectl describe pods -n cloud-resource-docs

# Verifica i log
kubectl logs -n cloud-resource-docs -l app.kubernetes.io/name=cloud-resource-docs
```

### Ingress non funziona

```bash
# Controlla la configurazione dell'ingress
kubectl describe ingress -n cloud-resource-docs

# Verifica che Nginx Ingress Controller sia installato
kubectl get pods -n ingress-nginx
```

### Certificati TLS

```bash
# Controlla lo stato del certificato
kubectl describe certificate -n cloud-resource-docs

# Verifica cert-manager
kubectl get pods -n cert-manager
```