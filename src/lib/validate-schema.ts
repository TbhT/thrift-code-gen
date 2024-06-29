import {validate} from 'schema-utils'

type ValidateSchema = Parameters<typeof validate>[0]

type ValidateOptions = Parameters<typeof validate>[1]

type ValidateConfiguration = Parameters<typeof validate>[2]

export const defaultValidationConfiguration: ValidateConfiguration = {
  name: 'IDL',
  postFormatter: (formattedError, _error) =>
    // TODO: customized error
    formattedError,
}

export const validateSchema = (
  schema: ValidateSchema,
  options: ValidateOptions,
  validationConfiguration?: ValidateConfiguration,
) => {
  validate(schema, options, validationConfiguration)
}
