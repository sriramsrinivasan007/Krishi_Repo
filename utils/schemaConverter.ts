
import { Type } from '@google/genai';

function convertJsonTypeToGeminiType(jsonType: string): Type {
  switch (jsonType.toUpperCase()) {
    case 'STRING':
      return Type.STRING;
    case 'NUMBER':
      return Type.NUMBER;
    case 'INTEGER':
      return Type.INTEGER;
    case 'BOOLEAN':
      return Type.BOOLEAN;
    case 'ARRAY':
      return Type.ARRAY;
    case 'OBJECT':
      return Type.OBJECT;
    default:
      throw new Error(`Unsupported schema type: ${jsonType}`);
  }
}

export function convertSchemaForGemini(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const newSchema: any = {};

  if (schema.type) {
    newSchema.type = convertJsonTypeToGeminiType(schema.type);
  }

  if (schema.properties) {
    newSchema.properties = {};
    for (const key in schema.properties) {
      newSchema.properties[key] = convertSchemaForGemini(schema.properties[key]);
    }
  }

  if (schema.items) {
    newSchema.items = convertSchemaForGemini(schema.items);
  }

  if (schema.description) {
    newSchema.description = schema.description;
  }
  
  if (schema.required) {
    newSchema.required = schema.required;
  }
  
  if (schema.default) {
    newSchema.default = schema.default;
  }

  return newSchema;
}
