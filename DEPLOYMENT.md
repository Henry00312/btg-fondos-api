# BTG Pactual - Documentación de Despliegue

## Información del Proyecto

**Prueba Técnica:** Desarrollo Back End  
**Empresa:** BTG Pactual  
**Desarrollador:** Henry David Barrera Osorio  
**Repositorio:** https://github.com/Henry00312/btg-fondos-api  
**API Producción:** https://v4qsn6yjdj.us-east-2.awsapprunner.com

## Cumplimiento de Requisitos

### Requisito 5: Infraestructura en AWS - COMPLETADO

Toda la infraestructura está desplegada en AWS con VPC, IAM, Secrets Manager, CloudWatch, SNS, Lambda, S3 y KMS.

### Requisito 6: Despliegue CloudFormation - COMPLETADO

Template CloudFormation completo que despliega toda la infraestructura:
- Archivo: cloudformation-template.yaml
- Parámetros configurables
- Outputs documentados
- Documentación incluida

## Comandos de Despliegue

Validar Template:
aws cloudformation validate-template --template-body file://cloudformation-template.yaml --region us-east-2

Crear Infraestructura:
aws cloudformation create-stack --stack-name btg-fondos-backend --template-body file://cloudformation-template.yaml --capabilities CAPABILITY_NAMED_IAM --region us-east-2

## Resumen

**Estado:** COMPLETADO

- Aplicación funcionando: https://v4qsn6yjdj.us-east-2.awsapprunner.com
- Infraestructura AWS: 100% desplegada via CloudFormation
- Documentación: Completa e incluida

## Configuración de Seguridad

IMPORTANTE: Antes de desplegar, actualizar los parámetros MongoDBConnectionString, JWTSecret y AdminSecretKey en el template.

---

Documentación para Prueba Técnica BTG Pactual