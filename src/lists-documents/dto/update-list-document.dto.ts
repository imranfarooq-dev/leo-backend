import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
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
  @IsInt()
  @IsNotEmpty()
  document_id: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  add_list_ids?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  remove_list_ids?: number[];

  @Validate(AtLeastOneArrayValidator)
  atLeastOneArray?: boolean;
}
