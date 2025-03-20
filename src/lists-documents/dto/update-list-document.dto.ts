import {
  IsArray,
  IsOptional,
  IsString,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'atLeastOneArray', async: false })
class AtLeastOneArrayValidator implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object: UpdateListDocumentDto = args.object as UpdateListDocumentDto;
    return !!(object.add_list_ids?.length || object.remove_list_ids?.length);
  }

  defaultMessage() {
    return 'At least one of add_list_ids or remove_list_ids must be provided';
  }
}

export class UpdateListDocumentDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  add_list_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  remove_list_ids?: string[];

  @Validate(AtLeastOneArrayValidator)
  atLeastOneArray?: boolean;
}
