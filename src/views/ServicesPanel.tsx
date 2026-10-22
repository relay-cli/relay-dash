import {Box, Text} from 'ink';
import type {ServiceStatus} from '../sources/services.js';
import {cell, clean} from '../text.js';
import type {ShellTheme} from '../theme.js';

export interface ServicesPanelProps {
  services: readonly ServiceStatus[];
  /** Configured service names, shown as "checking" until the first poll returns. */
  names: readonly string[];
  width: number;
  theme: ShellTheme;
}

const stateOf = (service: ServiceStatus): string => {
  if (!service.reachable) return clean(service.reason ?? 'unreachable');
  if (service.ready) return 'ready';
  if (!service.live) return clean(service.reason ?? 'not live');
  return clean(service.reason ?? 'not ready');
};

const modelsOf = (service: ServiceStatus): string => {
  if (service.models === undefined) return '';
  if (service.models.length === 0) return 'no models';
  return service.models
    .map((model) =>
      model.state === undefined || ['ready', 'loaded'].includes(model.state)
        ? clean(model.id)
        : `${clean(model.id)} (${clean(model.state)})`,
    )
    .join(', ');
};

const count = (value: number | undefined): string => (value === undefined ? '–' : String(value));

export const ServicesPanel = ({services, names, width, theme}: ServicesPanelProps) => {
  const byName = new Map(services.map((service) => [service.name, service]));
  const ready = services.filter((service) => service.ready).length;
  const nameWidth = Math.min(14, Math.max(6, ...names.map((name) => name.length + 2)));
  const stateWidth = 20;
  const modelWidth = Math.max(0, width - 2 - nameWidth - stateWidth - 14);
  return (
    <Box flexDirection="column" width={width}>
      <Text bold color={theme.accent}>
        SERVICES{' '}
        <Text bold={false} color={theme.muted}>
          {names.length === 0 ? 'none configured' : `${ready}/${names.length} ready`}
        </Text>
      </Text>
      {names.length === 0 ? null : (
        <Text color={theme.muted} wrap="truncate-end">
          {'  '}
          {cell('name', nameWidth)}
          {cell('state', stateWidth)}
          {cell('queue', 7)}
          {cell('active', 7)}
          {modelWidth > 0 ? 'models' : ''}
        </Text>
      )}
      {names.map((name) => {
        const service = byName.get(name);
        if (service === undefined) {
          return (
            <Text key={name} color={theme.muted} wrap="truncate-end">
              {'· '}
              {cell(clean(name), nameWidth)}checking…
            </Text>
          );
        }
        const color = service.ready
          ? theme.success
          : service.reachable && service.live
            ? theme.warning
            : theme.danger;
        const mark = service.ready ? '●' : service.reachable ? '○' : '×';
        const queueColor =
          service.queueDepth !== undefined && service.queueDepth > 0 ? theme.warning : theme.text;
        return (
          <Text key={name} wrap="truncate-end">
            <Text color={color}>{mark} </Text>
            <Text color={theme.text}>{cell(clean(name), nameWidth)}</Text>
            <Text color={color}>{cell(stateOf(service), stateWidth)}</Text>
            <Text color={queueColor}>{cell(count(service.queueDepth), 7)}</Text>
            <Text color={theme.text}>{cell(count(service.active), 7)}</Text>
            {modelWidth > 0 ? (
              <Text color={theme.muted}>{cell(modelsOf(service), modelWidth)}</Text>
            ) : null}
          </Text>
        );
      })}
    </Box>
  );
};
