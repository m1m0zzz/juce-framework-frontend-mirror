/**
 * Returns a function object that calls a function registered on the JUCE backend and forwards all
 * parameters to it.
 *
 * The provided name should be the same as the name argument passed to
 * WebBrowserComponent::Options.withNativeFunction() on the backend.
 *
 * @param {String} name
 */
export function getNativeFunction(name: string): (...args: any[]) => number | Promise<any>;
/**
 * Returns a SliderState object that is connected to the backend WebSliderRelay object that was
 * created with the same name argument.
 *
 * To register a WebSliderRelay object create one with the right name and add it to the
 * WebBrowserComponent::Options struct using withOptionsFrom.
 *
 * @param {String} name
 */
export function getSliderState(name: string): any;
/**
 * Returns a ToggleState object that is connected to the backend WebToggleButtonRelay object that was
 * created with the same name argument.
 *
 * To register a WebToggleButtonRelay object create one with the right name and add it to the
 * WebBrowserComponent::Options struct using withOptionsFrom.
 *
 * @param {String} name
 */
export function getToggleState(name: string): any;
/**
 * Returns a ComboBoxState object that is connected to the backend WebComboBoxRelay object that was
 * created with the same name argument.
 *
 * To register a WebComboBoxRelay object create one with the right name and add it to the
 * WebBrowserComponent::Options struct using withOptionsFrom.
 *
 * @param {String} name
 */
export function getComboBoxState(name: string): any;
/**
 * Appends a platform-specific prefix to the path to ensure that a request sent to this address will
 * be received by the backend's ResourceProvider.
 * @param {String} path
 */
export function getBackendResourceAddress(path: string): string;
/**
 * This helper class is intended to aid the implementation of
 * AudioProcessorEditor::getControlParameterIndex() for editors using a WebView interface.
 *
 * Create an instance of this class and call its handleMouseMove() method in each mousemove event.
 *
 * This class can be used to continuously report the controlParameterIndexAnnotation attribute's
 * value related to the DOM element that is currently under the mouse pointer.
 *
 * This value is defined at all times as follows
 * * the annotation attribute's value for the DOM element directly under the mouse, if it has it,
 * * the annotation attribute's value for the first parent element, that has it,
 * * -1 otherwise.
 *
 * Whenever there is a change in this value, an event is emitted to the frontend with the new value.
 * You can use a ControlParameterIndexReceiver object on the backend to listen to these events.
 *
 * @param {String} controlParameterIndexAnnotation
 */
export class ControlParameterIndexUpdater {
    constructor(controlParameterIndexAnnotation: any);
    controlParameterIndexAnnotation: any;
    lastElement: any;
    lastControlParameterIndex: any;
    handleMouseMove(event: any): void;
    #private;
}
