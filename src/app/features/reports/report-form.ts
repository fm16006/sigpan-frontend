import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ReportDefinition } from '../../core/models/report.model';
import { ReportFormValues, initialValues, paramKeys } from './report-logic';

export type ReportForm = FormGroup<Record<string, FormControl<string | boolean>>>;

/**
 * Arma el formulario de parámetros a partir del contrato del reporte: un control por clave
 * (el rango de fechas aporta dos), con los valores por defecto y la obligatoriedad del contrato.
 */
export function createReportForm(definition: ReportDefinition): ReportForm {
  const values: ReportFormValues = initialValues(definition);
  const controls: Record<string, FormControl<string | boolean>> = {};

  for (const param of definition.parametros) {
    for (const key of paramKeys(param)) {
      controls[key] = new FormControl<string | boolean>(values[key], {
        nonNullable: true,
        validators: param.obligatorio && param.tipo !== 'BOOLEANO' ? [Validators.required] : [],
      });
    }
  }
  return new FormGroup(controls);
}
