import { useState, useEffect } from 'react';
import { configAPI } from '@/api/config';
import { AIConfig } from '@/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/renderer/components/ui/select';

interface ConfigSelectorProps {
  selectedConfig: string;
  onSelect: (name: string) => void;
}

export function ConfigSelector({ selectedConfig, onSelect }: ConfigSelectorProps) {
  const [configs, setConfigs] = useState<Record<string, AIConfig>>({});

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    const cfg = await configAPI.getAllConfigs();
    setConfigs(cfg);
  };

  const configNames = Object.keys(configs);

  return (
    <Select value={selectedConfig} onValueChange={onSelect}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select a config" />
      </SelectTrigger>
      <SelectContent>
        {configNames.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}