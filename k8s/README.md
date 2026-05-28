# NeuralLog — Kubernetes Deployment

## Prerequisites
- Kubernetes cluster (self-hosted: k3s, kubeadm, or minikube)
- kubectl configured
- Docker images built and pushed to a registry
- nginx-ingress-controller installed

## Quick Deploy

```bash
# 1. Build and push images
docker build -t your-registry/neurallog-backend:latest ./backend
docker build -t your-registry/neurallog-frontend:latest ./frontend
docker push your-registry/neurallog-backend:latest
docker push your-registry/neurallog-frontend:latest

# 2. Update image names in backend-deployment.yaml and frontend-deployment.yaml

# 3. Set your API keys in secret.yaml (base64 encoded)
echo -n "gsk_your_groq_key" | base64

# 4. Apply all manifests in order
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/mysql-pvc.yaml
kubectl apply -f k8s/mysql-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml

# 5. Watch rollout
kubectl rollout status deployment/backend  -n neurallog
kubectl rollout status deployment/frontend -n neurallog

# 6. Port-forward for local access (no ingress needed)
kubectl port-forward svc/frontend-service 3000:80  -n neurallog &
kubectl port-forward svc/backend-service  8080:8080 -n neurallog &
```

## Architecture
- **MySQL**: Single pod with PVC (use StatefulSet + replica for HA)
- **Backend**: 2 replicas, HPA scales to 10 on CPU>70%
- **Frontend**: 2 replicas, static Nginx serving React SPA
- **Ingress**: nginx with SSE streaming support (`proxy-buffering: off`)

## Scaling Notes
- Backend is fully stateless — scale freely
- SSE connections are per-pod; use sticky sessions (`nginx.ingress.kubernetes.io/affinity: cookie`) if needed
- MySQL is the single bottleneck — consider read replicas for high-volume analytics queries
EOF

echo "K8s manifests created:" && ls /home/claude/llm-platform/k8s/
Output

K8s manifests created:
README.md
backend-deployment.yaml
configmap.yaml
frontend-deployment.yaml
hpa.yaml
ingress.yaml
mysql-deployment.yaml
mysql-pvc.yaml
namespace.yaml
secret.yaml