declare module 'preact-portal' {
    import { ComponentChildren, JSX } from 'preact';
    export interface PortalProps {
        children: ComponentChildren;
        into: string | Element;
    }
    export default function Portal(props: PortalProps): JSX.Element;
}